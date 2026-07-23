import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Fuente: API pública de ESPN (gratis, temporada actual, en vivo).
const ESPN_LEAGUE = process.env.ESPN_LEAGUE_SLUG || 'arg.1'

// Ventana a sincronizar: partidos recientes + en curso + próximas fechas.
// OJO: ESPN devuelve como máximo 100 eventos por consulta; con una ventana
// demasiado amplia trunca el final y una fecha puede quedar "a medias".
// Con ~5 fechas de ventana (≈75-90 partidos) quedamos siempre por debajo
// del tope. La base acumula el historial igual: nada se pierde.
const DAYS_BACK = 10
const DAYS_AHEAD = 28

// Throttle global (por instancia): evita golpear ESPN en cada request, pero
// bajo para que los marcadores en vivo se refresquen seguido.
const MIN_INTERVAL_MS = 25_000
let lastSyncAt = 0

type EspnCompetitor = {
  homeAway: 'home' | 'away'
  score?: string
  team: { displayName: string; logo?: string }
}
type EspnEvent = {
  id: string
  date: string
  status: { type: { state: 'pre' | 'in' | 'post' } }
  competitions: { competitors: EspnCompetitor[] }[]
}

function mapState(state: string): 'pending' | 'in_progress' | 'finished' {
  if (state === 'in') return 'in_progress'
  if (state === 'post') return 'finished'
  return 'pending'
}
function toScore(c: EspnCompetitor): number | null {
  const n = parseInt(c?.score ?? '', 10)
  return Number.isFinite(n) ? n : null
}
function ymd(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, '')
}
function teamsOf(e: EspnEvent): string[] {
  return e.competitions[0].competitors.map((c) => c.team.displayName)
}

// Agrupa en "fechas": cada equipo juega una vez por fecha, así que la
// repetición de un equipo marca el inicio de la siguiente. La fecha se
// identifica por el día de su primer partido (YYYY-MM-DD), que es estable.
function assignRounds(events: EspnEvent[]): Map<string, string> {
  const sorted = [...events].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )
  const roundByEventId = new Map<string, string>()
  let seen = new Set<string>()
  let roundKey: string | null = null
  for (const e of sorted) {
    const names = teamsOf(e)
    if (roundKey && names.some((n) => seen.has(n))) {
      seen = new Set()
      roundKey = null
    }
    if (!roundKey) roundKey = e.date.slice(0, 10)
    names.forEach((n) => seen.add(n))
    roundByEventId.set(e.id, roundKey)
  }
  return roundByEventId
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const cronSecret = request.headers.get('x-cron-secret')
    const isCron = !!process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET
    if (!user && !isCron) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Cliente de escritura: service_role si está disponible (funciona para
    // cualquier usuario), si no la sesión (solo escribe si es admin por RLS).
    const admin = createAdminClient()
    const writer = admin ?? supabase

    // Throttle: si sincronizamos hace muy poco, no repetimos.
    const force = new URL(request.url).searchParams.get('force') === '1'
    if (!force && Date.now() - lastSyncAt < MIN_INTERVAL_MS) {
      return NextResponse.json({ skipped: true, reason: 'throttled' })
    }

    const now = new Date()
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${ESPN_LEAGUE}/scoreboard?dates=${ymd(
      new Date(now.getTime() - DAYS_BACK * 86400000)
    )}-${ymd(new Date(now.getTime() + DAYS_AHEAD * 86400000))}`

    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) throw new Error(`ESPN respondió ${res.status}`)
    const data = await res.json()
    const events: EspnEvent[] = data.events || []
    if (events.length === 0) {
      return NextResponse.json({ error: 'ESPN no devolvió partidos.' }, { status: 404 })
    }

    const rounds = assignRounds(events)
    const rows = events.map((e) => {
      const comp = e.competitions[0].competitors
      const home = comp.find((c) => c.homeAway === 'home')!
      const away = comp.find((c) => c.homeAway === 'away')!
      const status = mapState(e.status.type.state)
      return {
        api_id: Number(e.id),
        home_team: home.team.displayName,
        away_team: away.team.displayName,
        home_logo: home.team.logo ?? null,
        away_logo: away.team.logo ?? null,
        match_date: e.date,
        round: rounds.get(e.id) ?? e.date.slice(0, 10),
        status,
        home_score: status === 'pending' ? null : toScore(home),
        away_score: status === 'pending' ? null : toScore(away),
      }
    })

    const { error: upsertError } = await writer
      .from('matches')
      .upsert(rows, { onConflict: 'api_id' })
    if (upsertError) {
      const msg = upsertError.message || ''
      // Usuario común sin service_role: RLS bloquea la escritura. Caso esperado,
      // no es un error (verá los datos de la última sincronización).
      if (upsertError.code === '42501' || msg.includes('row-level security') || msg.includes('permission denied')) {
        return NextResponse.json(
          { skipped: true, reason: 'sin_permisos_escritura', detail: msg },
          { status: 200 }
        )
      }
      // Columna inexistente => la migración SQL no se ejecutó todavía.
      if (upsertError.code === 'PGRST204' || upsertError.code === '42703' || msg.includes('schema cache') || msg.includes('does not exist')) {
        return NextResponse.json(
          {
            error:
              'La base de datos todavía no está migrada: ejecutá el archivo supabase/schema.sql en Supabase → SQL Editor y recargá la página.',
            detail: msg,
          },
          { status: 200 }
        )
      }
      // Índice único ausente/parcial u otro problema real: SIEMPRE visible.
      if (upsertError.code === '42P10' || msg.includes('ON CONFLICT')) {
        return NextResponse.json(
          {
            error:
              'Falta el índice único de sincronización: volvé a ejecutar supabase/schema.sql (versión actualizada) en Supabase → SQL Editor.',
            detail: msg,
          },
          { status: 200 }
        )
      }
      return NextResponse.json(
        { error: `No se pudieron guardar los partidos: ${msg}` },
        { status: 200 }
      )
    }

    lastSyncAt = Date.now()
    const { error: rpcError } = await writer.rpc('recalculate_points')
    if (rpcError) console.error('recalculate_points:', rpcError.message)

    return NextResponse.json({ ok: true, count: rows.length })
  } catch (err: any) {
    console.error('Sync Error:', err)
    return NextResponse.json({ error: 'Error interno', details: err.message }, { status: 500 })
  }
}
