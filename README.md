# ⚽ Prode Argentino — Liga Profesional

Prode estilo Mercado Pago para la **Liga Profesional del fútbol argentino**: pronosticá
los partidos de cada fecha, sumá puntos y competí en el ranking global y con tus amigos.

## Características

- **Pronósticos** que se bloquean exactamente a la hora de inicio de cada partido.
- **Puntuación estilo Mercado Pago**: 6 pts resultado exacto · 3 pts ganador/empate · 0 si fallás.
- **Partido de la Fecha (x2)**: bonificación de puntos dobles.
- **Resultados en vivo** desde la API pública de ESPN (gratis, temporada actual) con
  auto-refresco durante los partidos.
- **Ranking global** y **grupos privados** (ranking entre amigos con código de invitación).
- **Perfil estilo videojuego**: % de aciertos, mejor racha, niveles (Amateur → Leyenda).
- **Panel de administración**: sincronización de partidos y aprobación de usuarios.

## Stack

Next.js 16 (App Router) · React 19 · Supabase (Postgres + Auth) · CSS plano (glassmorphism).

## Puesta en marcha

Ver **[PUESTA-EN-MARCHA.md](PUESTA-EN-MARCHA.md)**. En resumen:

1. Configurar variables de entorno (ver `.env.local`):
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. Ejecutar la migración [`supabase/schema.sql`](supabase/schema.sql) en el SQL Editor de Supabase.
3. `npm install && npm run dev` → http://localhost:3000

## Licencia

Proyecto personal. Datos de partidos vía ESPN (API pública no oficial).
