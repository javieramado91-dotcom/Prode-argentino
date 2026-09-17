# Proyecto: Prode del Fútbol Argentino

Prode estilo Mercado Pago para la Liga Profesional. Los resultados se actualizan solos
desde ESPN y los pronósticos se bloquean exactamente a la hora de inicio de cada partido.

- **Workspace:** `C:\Users\Gaspar\.gemini\antigravity\scratch\prode-argentina`
- **Stack:** Next.js 16 (App Router) · React 19 · Supabase (Postgres + Auth) · CSS plano
- **Diseño:** modo oscuro, glassmorphism, mobile-first. **Sin Tailwind.**
- **Producción:** https://prode-argentino.vercel.app (Vercel, deploy automático desde `main`)

Las reglas operativas —seguridad, orden de despliegue, ESPN, zona horaria— están en
**[AGENTS.md](AGENTS.md)**. Leelo antes de tocar la base o el sync.

## Reglas del juego

| | |
|---|---|
| Resultado exacto | 6 puntos |
| Ganador o empate acertado, marcador no | 3 puntos |
| Nada | 0 puntos |
| Partido de la Fecha | multiplica ×2 (lo elige el admin, uno por fecha) |

Desempates, en orden: puntos → más resultados exactos → nombre alfabético.

Se pronostica la fecha actual y las 2 siguientes (`PREDICTABLE_ROUNDS` en
`src/lib/prode.ts`). El bloqueo es por hora de inicio, no por el estado que informe
ESPN: un partido que empezó pero todavía figura `pending` igual está cerrado.

## Cómo está armado

```
src/app/
  dashboard/        pantalla principal (pestañas: Por jugar / En vivo / Resultados /
                    Calendario / Ranking / Premios)
  grupos/           torneos entre amigos: ranking, fechas en juego, placas exportables
  admin/            aprobar usuarios, elegir Partido de la Fecha
  perfil/           estadísticas, nivel, notificaciones push
  api/sync-matches  trae partidos de ESPN (lo dispara el cliente al entrar)
  api/notify        cron: sincroniza + manda las notificaciones push
src/lib/
  espn.ts           sincronización con ESPN
  espn-window.ts    qué meses se le piden (módulo aparte: ver "Tests" en AGENTS.md)
  rounds.ts         deduce el número de fecha (ESPN no lo da)
  awards.ts         ganador de cada fecha y premios de la temporada
  fecha.ts          TODO el formateo de fechas, fijado a hora argentina
  errores.ts        normaliza errores desconocidos sin usar `any`
  db-types.ts       forma de las filas de Supabase
supabase/schema.sql  migración idempotente: esquema, RPC, RLS y permisos
```

## Decisiones que conviene conocer

**La numeración de fechas se deduce.** ESPN no devuelve el número de fecha oficial, así
que `assignStableRounds` agrupa por "cada equipo juega una vez por fecha" y preserva las
claves ya consolidadas. Eso tolera los partidos postergados, que antes partían una fecha
en dos. Está cubierto por tests (`tests/rounds.test.mjs`).

**El esquema se migra a mano.** Desde el entorno de desarrollo solo hay anon key: no se
puede alterar el esquema por REST. Todo cambio va a `supabase/schema.sql` y lo corre el
usuario en el SQL Editor. Ver el orden de despliegue en AGENTS.md.

**La seguridad vive en la base, no en las Server Actions.** La anon key está en el
navegador, así que las reglas del juego se aplican con políticas RLS y GRANT por
columna. Las Server Actions validan también, pero para dar buenos mensajes de error —
no son la barrera.

**Los pronósticos de los rivales solo se ven con el partido empezado**, y desde el
dashboard únicamente mientras la fecha siga abierta; una vez cerrada, el historial se
consulta desde el torneo.

## Estado

En producción y funcionando: registro con aprobación del admin, pronósticos, bloqueo por
hora, sincronización automática, puntos, ranking global, torneos entre amigos con código
de invitación, premios de temporada, placas para compartir, notificaciones push y panel
de administración.
