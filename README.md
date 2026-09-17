# ⚽ Prode Argentino — Liga Profesional

Prode estilo Mercado Pago para la **Liga Profesional del fútbol argentino**: pronosticá
los partidos de cada fecha, sumá puntos y competí en el ranking global y con tus amigos.

## Características

- **Pronósticos** que se bloquean exactamente a la hora de inicio de cada partido.
- **Puntuación estilo Mercado Pago**: 6 pts resultado exacto · 3 pts ganador/empate · 0 si fallás.
- **Partido de la Fecha (x2)**: bonificación de puntos dobles.
- **Resultados en vivo** desde la API pública de ESPN (gratis, temporada actual) con
  auto-refresco durante los partidos y el minuto real de juego.
- **Ranking global** y **grupos privados** (ranking entre amigos con código de invitación).
- **Perfil estilo videojuego**: % de aciertos, mejor racha, niveles (Amateur → Leyenda).
- **Notificaciones push** (Web Push): aviso cuando un partido está por empezar (si no
  pronosticaste) y cuando termina con tus puntos. Se activan/desactivan por usuario.
- **Panel de administración**: sincronización de partidos y aprobación de usuarios.

## Stack

Next.js 16 (App Router) · React 19 · Supabase (Postgres + Auth) · CSS plano (glassmorphism).

## Seguridad

La clave `anon` de Supabase viaja al navegador por diseño, así que **las reglas del juego
se aplican en la base**, no en el código de la app: políticas RLS, GRANT por columna y
funciones `security definer`. Validar solo en una Server Action no protege nada — se
saltea escribiendo a PostgREST directo.

En concreto: nadie puede darse `is_admin`, escribirse `points_earned`, pronosticar con el
partido ya empezado, ni leer los pronósticos ajenos antes de que arranque el partido.

Si vas a tocar `supabase/schema.sql` o los permisos, leé primero **[AGENTS.md](AGENTS.md)**:
tiene las tres trampas de Postgres con las que ya tropezamos y cómo verificar que un
cambio realmente hizo efecto.

## Puesta en marcha

Ver **[PUESTA-EN-MARCHA.md](PUESTA-EN-MARCHA.md)**. En resumen:

1. Configurar variables de entorno (ver `.env.local`):
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. Ejecutar la migración [`supabase/schema.sql`](supabase/schema.sql) en el SQL Editor de Supabase.
3. `npm install && npm run dev` → http://localhost:3000

`npm test` corre los tests de agrupación de fechas, premios y ventana de sincronización.

> **Orden al desplegar:** si un cambio toca `schema.sql` *y* el código, el SQL va primero
> y el merge a `main` después. Al revés, las funciones nuevas todavía no existen.

## Licencia

Proyecto personal. Datos de partidos vía ESPN (API pública no oficial: puede cambiar sin
aviso — ver AGENTS.md).
