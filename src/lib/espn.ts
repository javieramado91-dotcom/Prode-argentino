// Sincronización de partidos desde la API pública de ESPN (gratis, sin key).
// Lógica compartida por /api/sync-matches (disparo del cliente/admin) y
// /api/notify (cron), para no duplicarla.

import type { SupabaseClient } from '@supabase/supabase-js'

// Fuente: API pública de ESPN (gratis, temporada actual, en vivo).
const ESPN_LEAGUE = process.env.ESPN_LEAGUE_SLUG || 'arg.1'

// Ventana a sincronizar: partidos recientes + en curso + próximas fechas.
const DAYS_BACK = 10
const DAYS_AHEAD = 28

// ESPN devuelve como MÁXIMO 100 eventos por consulta y trunca el final sin
// avisar. La ventana completa (38 días ≈ 105 partidos) ya tocaba ese tope: la
// última fecha llegaba incompleta (10 de 15 partidos). Por eso la pedimos en
// tramos y unimos los resultados. Con ~19 días por tramo son ≈3 fechas
// (≈45-60 partidos), bien lejos del tope.
const CHUNK_DAYS = 19
const ESPN_MAX_EVENTS = 100

type EspnCompetitor = {
  homeAway: 'home' | 'away'
  score?: string
  team: { displayName: string; logo?: string }
}
type EspnEvent = {
  id: string
  date: string
  status: {
    displayClock?: string
    type: { state: 'pre' | 'in' | 'post'; name?: string }
  }
  competitions: { competitors: EspnCompetitor[] }[]
}

function mapState(state: string): 'pending' | 'in_progress' | 'finished' {
  if (state === 'in') return 'in_progress'
  if (state === 'post') return 'finished'
  return 'pending'
}
// Minuto real del partido según ESPN (no calculado desde la hora de inicio, así
// no se le suma el entretiempo ni los atrasos). Solo para partidos en curso.
function liveDetail(e: EspnEvent): string | null {
  if (e.status.type.state !== 'in') return null
  if (e.status.type.name === 'STATUS_HALFTIME') return 'Entretiempo'
  return e.status.displayClock || null // ej: "65'", "90'+3'"
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

// Parte la ventana en tramos consecutivos (sin huecos ni superposición).
function windowRanges(now: Date): [string, string][] {
  const startMs = now.getTime() - DAYS_BACK * 86400000
  const endMs = now.getTime() + DAYS_AHEAD * 86400000
  const ranges: [string, string][] = []
  for (let s = startMs; s <= endMs; s += CHUNK_DAYS * 86400000) {
    const e = Math.min(s + (CHUNK_DAYS - 1) * 86400000, endMs)
    ranges.push([ymd(new Date(s)), ymd(new Date(e))])
  }
  return ranges
}

// Trae toda la ventana pidiéndola por tramos (en paralelo) y uniendo por id.
// Si FALLA algún tramo lanza: preferimos abortar la sincronización antes que
// guardar una vista parcial, porque `assignRounds` deduce las fechas a partir
// de los partidos presentes y con un hueco podría numerarlas mal.
async function fetchWindow(now: Date): Promise<EspnEvent[]> {
  const chunks = await Promise.all(
    windowRanges(now).map(async ([from, to]) => {
      const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${ESPN_LEAGUE}/scoreboard?dates=${from}-${to}`
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) throw new Error(`ESPN respondió ${res.status} (tramo ${from}-${to})`)
      const data = await res.json()
      const events: EspnEvent[] = data.events || []
      // Red de alerta: si un tramo llega al tope, ESPN pudo haberlo cortado.
      if (events.length >= ESPN_MAX_EVENTS) {
        console.error(
          `sync ESPN: el tramo ${from}-${to} devolvió ${events.length} eventos (tope ${ESPN_MAX_EVENTS}): puede venir truncado, achicar CHUNK_DAYS.`
        )
      }
      return events
    })
  )

  // Unimos deduplicando por id (los tramos no se superponen, pero por las dudas).
  const byId = new Map<string, EspnEvent>()
  for (const events of chunks) for (const e of events) byId.set(e.id, e)
  return [...byId.values()]
}

export type SyncResult =
  | { ok: true; count: number }
  | { ok: false; phase: 'espn' | 'upsert'; empty?: boolean; error: any }

// Trae la ventana de partidos de ESPN, los upsertea por api_id y recalcula los
// puntos. `writer` es el cliente con permiso de escritura (service_role o la
// sesión del admin). No hace throttle ni maneja HTTP: eso queda en la ruta.
export async function syncMatches(writer: SupabaseClient): Promise<SyncResult> {
  const now = new Date()

  let events: EspnEvent[]
  try {
    events = await fetchWindow(now)
  } catch (error) {
    return { ok: false, phase: 'espn', error }
  }
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
      status_detail: liveDetail(e),
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
