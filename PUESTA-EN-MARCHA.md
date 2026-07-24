# Puesta en marcha — Prode Argentino

Arreglé los errores y dejé el flujo completo funcionando (registro → aprobación →
pronóstico → bloqueo por hora → sincronización → puntos → ranking). Pero hay **2 cosas
que solo podés hacer vos** porque requieren accesos que yo no tengo.

---

## Paso 1 — Ejecutar la migración de la base de datos (OBLIGATORIO)

El motivo #1 por el que "no funcionaba": la tabla `predictions` **no tenía columnas
para guardar el marcador pronosticado**, así que ningún pronóstico se podía guardar. Con
la clave pública (anon) no puedo modificar el esquema; hay que correr un SQL una vez.

1. Entrá a **Supabase → tu proyecto → SQL Editor → New query**.
2. Pegá el contenido de [`supabase/schema.sql`](supabase/schema.sql) y hacé **Run**.

Eso agrega las columnas faltantes, crea el alta automática de perfil al registrarse, el
motor de puntos (6/3/0 estilo Mercado Pago), el ranking global y la seguridad (RLS).

3. **Registrate en la app** con tu email (`javieramado91@gmail.com`) desde `/login`.
4. Volvé al SQL Editor y corré este comando para convertirte en admin aprobado
   (ya está incluido al final del script, pero solo tiene efecto **después** de que
   exista tu usuario):

```sql
update public.users set is_admin = true, is_approved = true
where email = 'javieramado91@gmail.com';
```

---

## Paso 2 — Datos en tiempo real: ¡GRATIS y ya funciona!

El motivo #2 original: tu cuenta de **API-Football es plan Free**, que solo da datos de
2022 a 2024 y no permite partidos en vivo. Por eso la sincronización de la fecha actual
fallaba.

**Solución sin pagar nada:** cambié la fuente de datos a la **API pública de ESPN**
(`site.api.espn.com`), que es **gratis, no necesita API key, y tiene la temporada
actual (Clausura 2026) con resultados en vivo y escudos**. Lo verifiqué en vivo: trae
los 15 partidos de la Fecha 1 (Belgrano-Central, Racing, River, Boca, etc.).

- **Cómo se usa:** entrá a `/admin` → **Sincronizar Partidos**. Trae automáticamente la
  fecha vigente. Mientras haya partidos en curso, el dashboard se actualiza solo cada 30s.
- **No hay que configurar nada.** La liga está en [`.env.local`](.env.local) como
  `ESPN_LEAGUE_SLUG=arg.1` (Liga Profesional).

> **Nota honesta:** la API de ESPN es pública pero no oficialmente documentada. Es ideal
> para un proyecto personal/gratuito, pero podría cambiar sin aviso. Si algún día querés
> un proveedor con contrato/SLA, ahí sí conviene un plan pago (API-Football 2026); el
> código está aislado en un solo archivo (`sync-matches/route.ts`) para cambiarlo fácil.

---

## Qué arreglé (resumen técnico)

| # | Problema | Solución |
|---|----------|----------|
| 1 | `predictions` sin columnas de marcador → no se podía guardar nada | Migración `supabase/schema.sql` |
| 2 | Sync roto: temporada 2026 (Free no la tiene) + `current=true` vacío | `sync-matches` robusto: 1 sola llamada, autodetección de fecha, `api_id`, escudos, temporada configurable |
| 3 | No existía cálculo de puntos | Función SQL `recalculate_points()` (6/3/0), se llama al sincronizar |
| 4 | Ranking con datos falsos (`MOCK_USERS`) y "124" fijo | Ranking real vía `get_leaderboard()` + puntos y posición reales del usuario |
| 5 | El pronóstico se bloqueaba por estado, no por hora | Bloqueo exacto a la hora de inicio (servidor y UI) |
| 6 | Botón "Aprobar" del admin no hacía nada | Server action `approveUser` conectada |
| 7 | Usuario nuevo nunca aparecía para aprobar | Trigger `handle_new_user` crea el perfil al registrarse |
| 8 | Sin actualización en vivo | `LiveRefresher` refresca cada 30s si hay partidos en curso |
| 9 | `layout` decía "Create Next App", idioma inglés, fuente Geist pisaba Outfit | Metadata y `lang="es"` correctos, Outfit sin conflictos |
| 10 | `/api/seed` borraba TODOS los partidos sin login | Ahora requiere admin |

## Deploy en Vercel (conectado a GitHub)

El repo ya está en GitHub: **github.com/javieramado91-dotcom/Prode-argentino**.
Para que Vercel lo despliegue solo en cada `git push`:

1. Entrá a **[vercel.com/new](https://vercel.com/new)** e iniciá sesión (podés usar GitHub).
2. **Import Git Repository** → elegí `Prode-argentino`. Vercel detecta Next.js solo
   (no cambies Build Command ni Output).
3. **Deploy**. En ~1 min tenés la URL en vivo. Cada push a `main` re-despliega solo.

   > Las variables de Supabase ya vienen con un valor por defecto en el código (la
   > clave `publishable` es pública por diseño), así que **no hace falta configurarlas**
   > para que el sitio levante. Si querés sobreescribirlas, agregá en **Settings →
   > Environment Variables**: `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

5. **Importante para el login en producción:** en Supabase → **Authentication → URL
   Configuration**, poné tu dominio de Vercel (ej. `https://prode-argentino.vercel.app`)
   como **Site URL** y agregalo en **Redirect URLs**. Así los mails de confirmación y las
   sesiones funcionan en el dominio publicado.

> No hace falta configurar `API_FOOTBALL_KEY` ni `ESPN_LEAGUE_SLUG`: la fuente de datos
> es ESPN (gratis, sin key) y ya trae un valor por defecto.

### (Recomendado) Sincronización automática para TODOS los usuarios

La app sincroniza los partidos sola apenas cada usuario entra o refresca. Para que esa
escritura funcione para cualquier usuario (no solo el admin), agregá en Vercel →
**Settings → Environment Variables** la clave secreta de Supabase:

| Name | Value |
|------|-------|
| `SUPABASE_SERVICE_ROLE_KEY` | *(Supabase → Settings → API → **service_role**)* |

> Es **secreta**: se usa solo en el servidor, nunca llega al navegador. Sin ella, la
> sincronización automática la dispara únicamente el admin cuando entra (o con el botón
> del panel); el resto de los usuarios ven la última fecha sincronizada.

## Notificaciones push (avisos al celular)

La app ahora manda **notificaciones push** (llegan al celular aunque esté cerrada):

- **⚽ Partido por empezar** — hasta 3 h antes del inicio, solo a quien **todavía no
  cargó** su pronóstico.
- **🏁 Partido finalizado** — cuando termina, con el resultado y **tus puntos**.

Cada usuario las activa/desactiva desde **`/perfil` → Notificaciones**, y puede elegir
qué tipo de aviso quiere. Hay un botón de **prueba** para confirmar que llegan.

### Qué tenés que configurar (una sola vez)

1. **Migración**: volvé a correr [`supabase/schema.sql`](supabase/schema.sql) en el SQL
   Editor. Agrega 3 tablas nuevas (`push_subscriptions`, `notification_settings`,
   `notifications_log`) con su RLS. Es idempotente: no rompe nada de lo que ya está.

2. **Variables de entorno en Vercel** (Settings → Environment Variables):

   | Name | Value | Por qué |
   |------|-------|---------|
   | `SUPABASE_SERVICE_ROLE_KEY` | *(Supabase → Settings → API → service_role)* | **Obligatoria**: enviar a todos los usuarios necesita saltear RLS. |
   | `VAPID_PRIVATE_KEY` | *(tu clave privada VAPID — ver `.env.local`)* | **Obligatoria**: firma los push. Es SECRETA: **nunca** la pegues en el código ni en un archivo versionado. |
   | `CRON_SECRET` | *(un string largo cualquiera)* | Permite que el cron dispare los avisos sin sesión. |
   | `VAPID_SUBJECT` | `mailto:javieramado91@gmail.com` | Opcional (ya tiene default). |
   | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | *(opcional: la pública ya está como default en el código)* | Solo si rotás las claves. |

   > La **clave pública** VAPID está pensada para ser visible (viaja al navegador),
   > por eso va en el código como default (`src/lib/push/keys.ts`). La **privada**
   > vive SOLO en variables de entorno (`.env.local` local, Vercel en prod) y **jamás**
   > se commitea. Para generar/rotar el par: `npx web-push generate-vapid-keys` y
   > actualizá la pública en `keys.ts` y la privada en las variables de entorno.

3. **Cron que dispara los avisos** — el servidor necesita que algo lo despierte cada
   pocos minutos para detectar los partidos que empiezan/terminan. La forma gratis:
   entrá a **[cron-job.org](https://cron-job.org)** (gratis), creá un job que haga
   **GET** a:

   ```
   https://prode-argentino.vercel.app/api/notify
   ```

   - Intervalo: **cada 2–5 minutos**.
   - En **Headers**, agregá: `x-cron-secret: <el mismo valor de CRON_SECRET>`.

   Ese endpoint, en cada corrida, sincroniza los partidos con ESPN y manda los avisos
   pendientes (sin repetir: usa `notifications_log`). Sin cron, los push no se envían
   solos (pero el botón de prueba en `/perfil` sí funciona igual).

> **iPhone**: por limitación de Apple, el push solo funciona si el usuario **instala la
> app** (Compartir → “Agregar a pantalla de inicio”) y la abre desde el ícono. La
> pantalla de `/perfil` ya muestra ese aviso automáticamente en iOS.

## Cómo se ve y se juega (mobile-first)

El dashboard está dividido en **secciones con pestañas**, pensadas para el celular:

- **Por jugar** — próximos partidos que podés pronosticar (hasta **3 fechas** hacia
  adelante), agrupados por fecha.
- **En vivo** — partidos en curso, con marcador que se actualiza solo.
- **Resultados** — partidos finalizados con tu puntaje.
- **Calendario** — todas las fechas (pasadas, presentes y futuras) para consultar.
- **Ranking** — tabla general, exportable a imagen.

Los partidos que están a más de 3 fechas se ven en el calendario con un ⏳ y se habilitan
para pronosticar cuando se acercan. Cada pronóstico se bloquea a la hora de inicio.

## Gamificación ya incluida

- **Perfil estilo videojuego** (`/perfil`): puntos, % de aciertos, partidos jugados,
  resultados exactos, ganador acertado, **mejor racha** 🔥 y **puesto** en el ranking.
  Con **niveles** y barra de progreso: 🥉 Amateur → 🥈 Experto → 🥇 Maestro → 👑 Leyenda.
- **Partido de la Fecha (vale doble)**: desde `/admin` elegís un partido destacado; sus
  puntos valen **x2** (6→12, 3→6). Se muestra con un badge ⭐ en el dashboard.
- **Grupos privados (ranking entre amigos)** (`/grupos`): creás un grupo y compartís el
  **código de invitación**; cada grupo tiene su propio ranking, exportable a imagen para
  compartir. Unirse es con el código.

## Ideas para después
Insignias por racha (bronce/plata/oro), XP por participación, rankings semanal/mensual/
por provincia, y predicciones especiales de pretemporada (campeón, goleador, descenso).
La base (puntos, ranking, perfiles, niveles, grupos) ya está lista para construir encima.
