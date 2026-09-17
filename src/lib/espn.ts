// Sincronización de partidos desde la API pública de ESPN (gratis, sin key).
// Lógica compartida por /api/sync-matches (disparo del cliente/admin) y
// /api/notify (cron), para no duplicarla.

import type { SupabaseClient } from '@supabase/supabase-js'
import { mensajeDeError } from './errores'
import { assignStableRounds } from '@/lib/rounds'
import { windowMonths } from './espn-window'

// El error puede venir de fetch (Error) o de PostgREST ({ message, code }).
export type SyncError = { message: string; code?: string }

// Fuente: API pública de ESPN (gratis, temporada actual, en vivo).
const ESPN_LEAGUE = process.env.ESPN_LEAGUE_SLUG || 'arg.1'


// ESPN devuelve como MÁXIMO 100 eventos por consulta y trunca el final sin
// avisar. La ventana completa ya tocaba ese tope y la última fecha llegaba
// incompleta, así que la pedimos partida y unimos los resultados.
//
// Se pide por MES (`dates=YYYYMM`), no por rango de días. ESPN dejó de aceptar
// `dates=DESDE-HASTA`: desde 2026-09-17 devuelve 400 para CUALQUIER rango, hasta
// para uno de dos días. Verificado a mano contra la API; era lo que tenía el
// sync caído en producción ("Error interno" en el dashboard). La forma por mes
// trae ≈45-60 partidos, bien lejos del tope, y son 2-3 pedidos igual que antes.
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

// Trae toda la ventana pidiéndola por tramos (en paralelo) y uniendo por id.
// Si FALLA algún tramo lanza: preferimos abortar la sincronización antes que
// guardar una vista parcial, porque el agrupador deduce las fechas a partir de
// los partidos presentes y con un hueco podría numerarlas mal.
async function fetchWindow(now: Date): Promise<EspnEvent[]> {
  const chunks = await Promise.all(
    windowMonths(now).map(async (mes) => {
      const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${ESPN_LEAGUE}/scoreboard?dates=${mes}`
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) throw new Error(`ESPN respondió ${res.status} (mes ${mes})`)
      const data = await res.json()
      const events: EspnEvent[] = data.events || []
      // Red de alerta: si un mes llega al tope, ESPN pudo haberlo cortado.
      if (events.length >= ESPN_MAX_EVENTS) {
        console.error(
          `sync ESPN: el mes ${mes} devolvió ${events.length} eventos (tope ${ESPN_MAX_EVENTS}): puede venir truncado.`
        )
      }
      return events
    })
  )

  // Unimos deduplicando por id (los meses no se superponen, pero por las dudas).
  const byId = new Map<string, EspnEvent>()
  for (const events of chunks) for (const e of events) byId.set(e.id, e)
  return [...byId.values()]
}

export type SyncResult =
  | { ok: true; count: number }
  | { ok: false; phase: 'espn' | 'upsert'; empty?: boolean; error: SyncError }

// Trae la ventana de partidos de ESPN, los upsertea por api_id y recalcula los
// puntos. `writer` es el cliente con permiso de escritura (service_role o la
// sesión del admin). No hace throttle ni maneja HTTP: eso queda en la ruta.
export async function syncMatches(writer: SupabaseClient): Promise<SyncResult> {
  const now = new Date()

  let events: EspnEvent[]
  try {
    events = await fetchWindow(now)
  } catch (error) {
    // Lo que cae acá es `unknown`: lo normalizamos a Error para que la ruta
    // pueda leerle el `.message` sin castear.
    return {
      ok: false,
      phase: 'espn',
      error: error instanceof Error ? error : new Error(mensajeDeError(error)),
    }
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
