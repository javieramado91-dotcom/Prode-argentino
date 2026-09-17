<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Reglas del proyecto

Lo de abajo son cosas que ya salieron mal una vez. No son preferencias de estilo:
cada punto costó un bug en producción.

## Seguridad: la anon key está en el navegador

La app usa la clave `anon` de Supabase, que por diseño viaja en el bundle del cliente
y está en este repo (`src/lib/supabase/config.ts`). Asumí que **cualquiera puede hacer
consultas arbitrarias a PostgREST con esa clave**.

Consecuencia directa: **validar en una Server Action no protege nada.** La validación
de "no se puede pronosticar con el partido empezado" vivía solo en `savePrediction`, y
se salteaba con un `supabase.from('predictions').upsert(...)` desde la consola del
navegador: se esperaba el resultado y se cargaba el marcador exacto. Toda regla del
juego tiene que estar **además** en la política RLS.

### Tres cosas que no son obvias en Postgres

1. **Las políticas RLS son permisivas y se combinan con OR.** Alcanza con que UNA deje
   pasar. Este proyecto arrastraba políticas creadas desde el panel de Supabase con rol
   `public` y condición `true`, que convivían con las de `schema.sql` y las anulaban.
   El script decía "Success" y el agujero seguía abierto. Están borradas en la sección
   6m de `schema.sql`; si alguien crea una desde el panel, vuelve el problema.

2. **RLS decide qué FILAS, no qué COLUMNAS.** "Podés editar tu propia fila" significaba
   también "podés darte `is_admin`" y "podés escribirte `points_earned`". Para acotar
   columnas van GRANT por columna (sección 7 de `schema.sql`), y las escrituras
   privilegiadas pasan por RPC `security definer` que validan quién llama
   (`admin_approve_user`, `admin_delete_user`).

3. **`revoke execute ... from anon` no hace nada por sí solo.** Postgres le otorga
   EXECUTE a `PUBLIC` por defecto en cada función que se crea, así que el permiso le
   sigue llegando a `anon` por ahí. Hay que `revoke ... from public` y después
   `grant ... to authenticated, service_role`.

### Verificá el efecto, no la intención

Después de tocar RLS o permisos, **comprobalo desde afuera**. Que el SQL Editor diga
"Success" no prueba nada:

```bash
URL=https://<proyecto>.supabase.co ; KEY=<anon key de config.ts>
# Sin sesión, esto tiene que devolver [] en todas:
for t in predictions matches groups users; do
  curl -s -H "apikey: $KEY" "$URL/rest/v1/$t?select=id&limit=1"; echo
done
# Y las RPC tienen que dar "permission denied for function":
curl -s -X POST -H "apikey: $KEY" -H "Content-Type: application/json" \
     -d '{}' "$URL/rest/v1/rpc/get_leaderboard"
```

Si devuelve filas, hay una política permisiva de más. Listalas con `pg_policies` y
mirá la columna `roles`.

## Orden de despliegue

Cuando un cambio toca `schema.sql` **y** el código:

1. Correr `supabase/schema.sql` en Supabase → SQL Editor (es idempotente).
2. Verificar el efecto desde afuera.
3. Recién ahí mergear a `main` (Vercel deploya solo).

Al revés, las RPC nuevas todavía no existen y esas pantallas rompen. El SQL no se puede
correr desde el entorno de desarrollo —solo hay anon key— ni validar localmente, porque
no hay Postgres: lo ejecuta el usuario y confirma.

**Si el script corta por un error a mitad de camino, todo lo que viene después no se
aplica.** Ya pasó, y dejó la base en un estado mezclado que parecía correcto.

## ESPN

Fuente de datos: `site.api.espn.com/.../soccer/arg.1/scoreboard`. Gratis, sin key, no
oficial — **puede cambiar sin aviso, y ya lo hizo**.

- El formato es `dates=YYYYMM` (mes entero, ≈45-60 eventos). **Los rangos
  `dates=DESDE-HASTA` devuelven 400**, hasta para dos días; rompieron el sync en
  producción el 2026-09-17.
- Tope de ~100 eventos por consulta, que trunca sin avisar. Por eso se pide por mes y
  no todo junto. Hay un `console.error` de alerta si un mes roza el tope.
- ESPN no da el número de fecha oficial: se deduce en `src/lib/rounds.ts`.

**Si el dashboard muestra "Error interno", probá los formatos de `dates` con curl antes
de tocar código.** El mensaje de error señala el último tramo evaluado, no la causa.

## Zona horaria

Todo el formateo de fechas pasa por `src/lib/fecha.ts`, fijado a
`America/Argentina/Buenos_Aires`. **No uses `Intl.DateTimeFormat` suelto**: sin
`timeZone` toma la del proceso, y en Vercel el servidor corre en UTC. Un partido de las
21:15 del viernes salía como "sáb, 12:15 a. m." — y en los componentes cliente, que
igual se renderizan en el servidor, además rompe la hidratación.

Lo mismo con `toDateString()` para comparar días: usá `diaAR()`.

## Tests

`npm test` (node:test con `--experimental-strip-types`). El runner **no resuelve alias
ni imports sin extensión**, así que la lógica que se quiera testear va en un módulo sin
imports: `src/lib/rounds.ts`, `src/lib/espn-window.ts`. Ese es el motivo de que
`windowMonths` viva aparte de `espn.ts`.
