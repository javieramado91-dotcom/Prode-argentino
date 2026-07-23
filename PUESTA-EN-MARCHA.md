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
3. Antes de **Deploy**, abrí **Environment Variables** y agregá estas dos
   (son públicas, van en el navegador; están protegidas por RLS en Supabase):

   | Name | Value |
   |------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://uxdnedasfycjuopplrdh.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_yTGoxplxXwc5FtL2zUI5tQ_bmcQtPl4` |

4. **Deploy**. En ~1 min tenés la URL en vivo. Cada push a `main` re-despliega solo.

5. **Importante para el login en producción:** en Supabase → **Authentication → URL
   Configuration**, poné tu dominio de Vercel (ej. `https://prode-argentino.vercel.app`)
   como **Site URL** y agregalo en **Redirect URLs**. Así los mails de confirmación y las
   sesiones funcionan en el dominio publicado.

> No hace falta configurar `API_FOOTBALL_KEY` ni `ESPN_LEAGUE_SLUG`: la fuente de datos
> es ESPN (gratis, sin key) y ya trae un valor por defecto.

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
