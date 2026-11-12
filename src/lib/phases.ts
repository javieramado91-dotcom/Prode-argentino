// Fases del torneo argentino (Fase de Grupos → Playoffs) y nombres de cada ronda.
//
// Las fases se definen por fecha de corte sobre la clave `round` de los partidos
// (YYYY-MM-DD del primer partido de la fecha). No requiere cambios en la base:
// los puntos por fecha ya vienen de get_round_scores / get_group_round_scores y
// acá solo se agrupan por fase.
//
// Para una temporada nueva alcanza con agregar sus fases a PHASES.

import type { RoundScore } from './awards'

export type PhaseKind = 'regular' | 'playoffs'

export type PhaseDef = {
  key: string
  kind: PhaseKind
  name: string // "Fase de Grupos" | "Playoffs"
  season: string // "Torneo Clausura 2026"
  from: string // round >= from (inclusive)
  to: string | null // round < to (exclusivo); null = abierta
}

export const PHASES: PhaseDef[] = [
  {
    key: 'clausura-2026-grupos',
    kind: 'regular',
    name: 'Fase de Grupos',
    season: 'Torneo Clausura 2026',
    from: '2026-07-01',
    to: '2026-11-15',
  },
  {
    key: 'clausura-2026-playoffs',
    kind: 'playoffs',
    name: 'Playoffs',
    season: 'Torneo Clausura 2026',
    from: '2026-11-15',
    to: null,
  },
]

export function phaseDefOf(round: string | null | undefined): PhaseDef | null {
  if (!round) return null
  return PHASES.find((p) => round >= p.from && (p.to === null || round < p.to)) ?? null
}

// ¿Esta clave de fecha pertenece a una fase de playoffs? (la usa el sync para
// no mezclar los cruces con las fechas regulares al agrupar).
export function isPlayoffRound(round: string | null | undefined): boolean {
  return phaseDefOf(round)?.kind === 'playoffs'
}

// ---------------------------------------------------------------------------
// Instancias de playoffs
// ---------------------------------------------------------------------------

export type StageKey = 'r32' | 'r16' | 'qf' | 'sf' | 'final'

export const STAGES: { key: StageKey; name: string; short: string; size: number }[] = [
  { key: 'r32', name: 'Dieciseisavos de final', short: '16avos', size: 16 },
  { key: 'r16', name: 'Octavos de final', short: 'Octavos', size: 8 },
  { key: 'qf', name: 'Cuartos de final', short: 'Cuartos', size: 4 },
  { key: 'sf', name: 'Semifinales', short: 'Semis', size: 2 },
  { key: 'final', name: 'Final', short: 'Final', size: 1 },
]

// Cuadro que se muestra en la UI (el Clausura arranca en octavos).
export const BRACKET: StageKey[] = ['r16', 'qf', 'sf', 'final']

function stageBySize(n: number) {
  return STAGES.find((s) => s.size === n) ?? null
}

// ---------------------------------------------------------------------------
// Etiquetas por fecha / ronda
// ---------------------------------------------------------------------------

export type RoundInfo = {
  round: string
  phaseKey: string | null
  kind: PhaseKind
  label: string // "Fecha 7" | "Octavos de final"
  short: string // "F7" | "Octavos"
  number: number | null // número de fecha dentro de la fase regular
  stage: StageKey | null
}

type MatchLite = { round: string | null; status?: string | null; match_date?: string | null }

/**
 * Arma el nombre de cada fecha. Las fechas regulares se numeran dentro de su
 * fase (Fecha 1..16) y las de playoffs se nombran por la cantidad de partidos
 * de la ronda (8 = Octavos, 4 = Cuartos, 2 = Semis, 1 = Final).
 */
export function buildRoundInfo(matches: MatchLite[]): Map<string, RoundInfo> {
  const counts = new Map<string, number>()
  for (const m of matches) {
    if (!m.round) continue
    counts.set(m.round, (counts.get(m.round) || 0) + 1)
  }
  const rounds = [...counts.keys()].sort()

  const seqByPhase = new Map<string, number>()
  const usedStages = new Set<string>()
  const out = new Map<string, RoundInfo>()
  for (const round of rounds) {
    const def = phaseDefOf(round)
    const phaseKey = def?.key ?? null
    const seq = (seqByPhase.get(phaseKey ?? '-') || 0) + 1
    seqByPhase.set(phaseKey ?? '-', seq)

    if (def?.kind === 'playoffs') {
      const st = stageBySize(counts.get(round) || 0)
      const stageId = st ? `${phaseKey}:${st.key}` : null
      if (st && stageId && !usedStages.has(stageId)) {
        usedStages.add(stageId)
        out.set(round, { round, phaseKey, kind: 'playoffs', label: st.name, short: st.short, number: null, stage: st.key })
      } else {
        out.set(round, { round, phaseKey, kind: 'playoffs', label: `Playoffs · Ronda ${seq}`, short: `R${seq}`, number: null, stage: null })
      }
      continue
    }

    out.set(round, { round, phaseKey, kind: 'regular', label: `Fecha ${seq}`, short: `F${seq}`, number: seq, stage: null })
  }
  return out
}

export function roundLabel(info: Map<string, RoundInfo>, round: string | null | undefined): string {
  if (!round) return 'Fecha'
  return info.get(round)?.label ?? 'Fecha'
}

// Versión serializable (para pasar de server a client components).
export function roundLabelRecord(info: Map<string, RoundInfo>): Record<string, string> {
  const rec: Record<string, string> = {}
  for (const [k, v] of info) rec[k] = v.label
  return rec
}

// ---------------------------------------------------------------------------
// Fases con datos
// ---------------------------------------------------------------------------

export type PhaseInfo = {
  def: PhaseDef
  rounds: string[] // ordenadas cronológicamente
  started: boolean // algún partido ya empezó
  complete: boolean // todos los partidos de la fase finalizados
  firstDate: string | null
  lastDate: string | null
  matchCount: number
  finishedCount: number
}

export function buildPhases(matches: MatchLite[], now: number = Date.now()): PhaseInfo[] {
  const byPhase = new Map<string, MatchLite[]>()
  for (const m of matches) {
    const def = phaseDefOf(m.round)
    if (!def) continue
    if (!byPhase.has(def.key)) byPhase.set(def.key, [])
    byPhase.get(def.key)!.push(m)
  }
  const out: PhaseInfo[] = []
  for (const def of PHASES) {
    const ms = byPhase.get(def.key)
    if (!ms || ms.length === 0) continue
    const dates = ms.map((m) => m.match_date || '').filter(Boolean).sort()
    out.push({
      def,
      rounds: [...new Set(ms.map((m) => m.round as string))].sort(),
      started: ms.some((m) => m.status !== 'pending' || (m.match_date ? new Date(m.match_date).getTime() <= now : false)),
      complete: ms.every((m) => m.status === 'finished'),
      firstDate: dates[0] ?? null,
      lastDate: dates[dates.length - 1] ?? null,
      matchCount: ms.length,
      finishedCount: ms.filter((m) => m.status === 'finished').length,
    })
  }
  return out
}

// Estado de cada instancia del cuadro de playoffs (para el encabezado).
export type BracketStage = {
  key: StageKey
  name: string
  short: string
  size: number
  status: 'done' | 'live' | 'next' | 'tbd'
  firstDate: string | null
  lastDate: string | null
}

export function bracketStatus(
  matches: (MatchLite & { match_date?: string | null })[],
  info: Map<string, RoundInfo>,
  phaseKey: string,
  now: number = Date.now()
): BracketStage[] {
  return BRACKET.map((key) => {
    const st = STAGES.find((s) => s.key === key)!
    const ms = matches.filter((m) => {
      const ri = m.round ? info.get(m.round) : null
      return ri?.phaseKey === phaseKey && ri.stage === key
    })
    const dates = ms.map((m) => m.match_date || '').filter(Boolean).sort()
    let status: BracketStage['status'] = 'tbd'
    if (ms.length > 0) {
      const allDone = ms.every((m) => m.status === 'finished')
      const started = ms.some((m) => m.status !== 'pending' || (m.match_date ? new Date(m.match_date).getTime() <= now : false))
      status = allDone ? 'done' : started ? 'live' : 'next'
    }
    return { key, name: st.name, short: st.short, size: st.size, status, firstDate: dates[0] ?? null, lastDate: dates[dates.length - 1] ?? null }
  })
}

// ---------------------------------------------------------------------------
// Tablas por fase
// ---------------------------------------------------------------------------

export type Standing = {
  userId: string
  name: string
  points: number
  exacts: number
  roundsPlayed: number
}

/**
 * Tabla de una fase: suma los puntos y exactos de las fechas de esa fase.
 * `members` agrega a los que todavía no sumaron (aparecen con 0).
 * Orden: puntos, y a igual puntaje gana el que más resultados exactos tiene.
 */
export function phaseStandings(
  scores: RoundScore[],
  rounds: Iterable<string>,
  members: { id: string; name: string }[] = []
): Standing[] {
  const set = new Set(rounds)
  const map = new Map<string, Standing>()
  for (const m of members) {
    map.set(m.id, { userId: m.id, name: m.name, points: 0, exacts: 0, roundsPlayed: 0 })
  }
  for (const s of scores) {
    if (!set.has(s.round)) continue
    const row = map.get(s.user_id) || { userId: s.user_id, name: s.display_name, points: 0, exacts: 0, roundsPlayed: 0 }
    row.points += Number(s.points) || 0
    row.exacts += Number(s.exacts) || 0
    row.roundsPlayed += 1
    row.name = s.display_name || row.name
    map.set(s.user_id, row)
  }
  return [...map.values()].sort(
    (a, b) => b.points - a.points || b.exacts - a.exacts || a.name.localeCompare(b.name, 'es')
  )
}

// Posición con empates (mismos puntos y mismos exactos comparten puesto).
export function standingPositions(rows: { points: number; exacts: number }[]): number[] {
  const pos: number[] = []
  rows.forEach((r, i) => {
    if (i > 0 && r.points === rows[i - 1].points && r.exacts === rows[i - 1].exacts) pos.push(pos[i - 1])
    else pos.push(i + 1)
  })
  return pos
}

// Matriz jugador × fecha (para el historial de la fase): puntos por fecha.
export function pointsMatrix(scores: RoundScore[], rounds: string[]): Map<string, Map<string, { points: number; exacts: number }>> {
  const set = new Set(rounds)
  const out = new Map<string, Map<string, { points: number; exacts: number }>>()
  for (const s of scores) {
    if (!set.has(s.round)) continue
    if (!out.has(s.user_id)) out.set(s.user_id, new Map())
    out.get(s.user_id)!.set(s.round, { points: Number(s.points) || 0, exacts: Number(s.exacts) || 0 })
  }
  return out
}
