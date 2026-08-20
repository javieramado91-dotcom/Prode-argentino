// Sincronización de partidos desde la API pública de ESPN (gratis, sin key).
// Lógica compartida por /api/sync-matches (disparo del cliente/admin) y
// /api/notify (cron), para no duplicarla.

import type { SupabaseClient } from '@supabase/supabase-js'
import { assignStableRounds } from '@/lib/rounds'

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
  team: { id?: string; displayName: string; logo?: string }
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
// guardar una vista parcial, porque el agrupador deduce las fechas a partir de
// los partidos presentes y con un hueco podría numerarlas mal.
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

  // Conservamos las claves de las fechas ya consolidadas. Así un partido
  // adelantado/postergado se reincorpora a su fecha real sin crear una fecha
  // fantasma ni renombrar las demás.
  const { data: existing } = await writer
    .from('matches')
    .select('api_id, round, match_date, home_team, away_team')

  const rounds = assignStableRounds(
    events.map((event) => ({
      id: event.id,
      date: event.date,
      // Usamos los nombres porque son los equipos que persistimos en `matches`
      // y así el historial completo puede servir de contexto para agrupar.
      teams: event.competitions[0].competitors.map((competitor) => competitor.team.displayName),
    })),
    (existing || [])
      .filter((match) => match.api_id != null)
      .map((match) => ({
        apiId: String(match.api_id),
        round: match.round,
        date: match.match_date,
        teams: [match.home_team, match.away_team],
      }))
  )
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
