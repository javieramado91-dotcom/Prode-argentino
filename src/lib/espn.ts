// Sincronización de partidos desde la API pública de ESPN (gratis, sin key).
// Lógica compartida por /api/sync-matches (disparo del cliente/admin) y
// /api/notify (cron), para no duplicarla.

import type { SupabaseClient } from '@supabase/supabase-js'

// Fuente: API pública de ESPN (gratis, temporada actual, en vivo).
const ESPN_LEAGUE = process.env.ESPN_LEAGUE_SLUG || 'arg.1'

// Ventana a sincronizar: partidos recientes + en curso + próximas fechas.
// OJO: ESPN devuelve como máximo 100 eventos por consulta; con una ventana
// demasiado amplia trunca el final y una fecha puede quedar "a medias".
const DAYS_BACK = 10
const DAYS_AHEAD = 28

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

// Agrupa en "fechas". ESPN no da el número de fecha oficial, así que lo
// deducimos: en cada fecha, cada equipo juega EXACTAMENTE una vez.
//
// Algoritmo de "empaquetado": recorremos los partidos por fecha y asignamos
// cada uno a la PRIMERA fecha (bucket) donde todavía no jugó NINGUNO de sus dos
// equipos. Esto tolera los partidos postergados: un partido movido a más
// adelante vuelve a caer en su fecha original (donde sus equipos siguen libres),
// en vez de romper la numeración como haría un corte por "primer repetido".
// La fecha se identifica por el día de su primer partido (YYYY-MM-DD), estable.
function assignRounds(events: EspnEvent[]): Map<string, string> {
  const sorted = [...events].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  const buckets: { teams: Set<string>; minDate: string }[] = []
  const bucketOfEvent = new Map<string, number>()

  for (const e of sorted) {
    const names = teamsOf(e)
    // Primer bucket donde AMBOS equipos están libres (una fecha completa de 30
    // equipos ya no acepta a nadie, así que las fechas cerradas se saltean solas).
    let idx = buckets.findIndex((b) => names.every((n) => !b.teams.has(n)))
    if (idx === -1) {
      idx = buckets.length
      buckets.push({ teams: new Set(), minDate: e.date })
    }
    const b = buckets[idx]
    names.forEach((n) => b.teams.add(n))
    if (e.date < b.minDate) b.minDate = e.date
    bucketOfEvent.set(e.id, idx)
  }

  const key = buckets.map((b) => b.minDate.slice(0, 10))
  const roundByEventId = new Map<string, string>()
  for (const [id, idx] of bucketOfEvent) roundByEventId.set(id, key[idx])
  return roundByEventId
}

export type SyncResult =
  | { ok: true; count: number }
  | { ok: false; phase: 'espn' | 'upsert'; empty?: boolean; error: any }

// Trae la ventana de partidos de ESPN, los upsertea por api_id y recalcula los
// puntos. `writer` es el cliente con permiso de escritura (service_role o la
// sesión del admin). No hace throttle ni maneja HTTP: eso queda en la ruta.
export async function syncMatches(writer: SupabaseClient): Promise<SyncResult> {
  const now = new Date()
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${ESPN_LEAGUE}/scoreboard?dates=${ymd(
    new Date(now.getTime() - DAYS_BACK * 86400000)
  )}-${ymd(new Date(now.getTime() + DAYS_AHEAD * 86400000))}`

  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    return { ok: false, phase: 'espn', error: new Error(`ESPN respondió ${res.status}`) }
  }
  const data = await res.json()
  const events: EspnEvent[] = data.events || []
  if (events.length === 0) {
    return { ok: false, phase: 'espn', empty: true, error: new Error('ESPN no devolvió partidos.') }
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

  // Estabilidad de la fecha: si un partido YA está finalizado en la base, su
  // fecha quedó definida — la preservamos para que la ventana móvil de sync no
  // la "mueva" en corridas futuras. Solo se recalcula para partidos abiertos.
  const apiIds = rows.map((r) => r.api_id)
  const { data: existing } = await writer
    .from('matches')
    .select('api_id, round, status')
    .in('api_id', apiIds)
  const settled = new Map<number, string>()
  for (const m of existing || []) {
    if (m.status === 'finished' && m.round) settled.set(Number(m.api_id), m.round)
  }
  for (const r of rows) {
    const keep = settled.get(r.api_id)
    if (keep) r.round = keep
  }

  const { error: upsertError } = await writer
    .from('matches')
    .upsert(rows, { onConflict: 'api_id' })
  if (upsertError) {
    return { ok: false, phase: 'upsert', error: upsertError }
  }

  const { error: rpcError } = await writer.rpc('recalculate_points')
  if (rpcError) console.error('recalculate_points:', rpcError.message)

  return { ok: true, count: rows.length }
}
