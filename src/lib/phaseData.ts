// Arma, para un "ámbito" (ranking general o un torneo de amigos), todo lo que
// la UI necesita por fase: tablas, archivo de la fase cerrada y cuadro.
// Puro: recibe partidos + puntos por fecha (RPC existentes) + miembros.

import { computeAwards, computeFechaWinners, type RoundScore } from './awards'
import {
  bracketStatus,
  buildPhases,
  buildRoundInfo,
  phaseStandings,
  pointsMatrix,
  type BracketStage,
  type PhaseInfo,
  type RoundInfo,
  type Standing,
} from './phases'
import type { PhaseArchiveData } from '@/components/PhaseArchive/PhaseArchive'
import { diaMes } from './fecha'

type MatchRow = { round: string | null; status: string | null; match_date: string | null }

export type ScopeData = {
  info: Map<string, RoundInfo>
  labels: Record<string, string>
  phases: PhaseInfo[]
  regular: PhaseInfo | null
  playoffs: PhaseInfo | null
  general: Standing[]
  playoffRows: Standing[]
  playoffScores: RoundScore[]
  stages: BracketStage[]
  archive: PhaseArchiveData | null
}

const fmtDay = (iso: string) => diaMes(iso)

export function buildScopeData({
  matches,
  scores,
  members,
  context,
}: {
  matches: MatchRow[]
  scores: RoundScore[]
  members: { id: string; name: string }[]
  context: string
}): ScopeData {
  const info = buildRoundInfo(matches)
  const labels: Record<string, string> = {}
  for (const [k, v] of info) labels[k] = v.label
  const phases = buildPhases(matches)
  const regular = phases.find((p) => p.def.kind === 'regular') ?? null
  const playoffs = phases.find((p) => p.def.kind === 'playoffs') ?? null
  const roundOrder = [...info.keys()].sort()

  const general = phaseStandings(scores, roundOrder, members)
  const playoffRounds = new Set(playoffs?.rounds ?? [])
  const playoffRows = playoffs ? phaseStandings(scores, playoffRounds, members) : []
  const playoffScores = scores.filter((s) => playoffRounds.has(s.round))
  const stages = playoffs ? bracketStatus(matches, info, playoffs.def.key) : []

  let archive: PhaseArchiveData | null = null
  if (regular && regular.complete) {
    const regRounds = new Set(regular.rounds)
    const regScores = scores.filter((s) => regRounds.has(s.round))
    const fechaWinners = computeFechaWinners(regScores, roundOrder, info)
    const awards = computeAwards(regScores, fechaWinners)
    const scoredRounds = new Set(regScores.map((s) => s.round))
    const columns = regular.rounds
      .filter((r) => scoredRounds.has(r))
      .map((r) => ({ round: r, short: info.get(r)?.short ?? r, label: info.get(r)?.label ?? r }))
    const m = pointsMatrix(regScores, regular.rounds)
    const matrix: PhaseArchiveData['matrix'] = {}
    for (const [uid, cells] of m) matrix[uid] = Object.fromEntries(cells)
    // Solo quienes jugaron la fase (los que se sumaron después no figuran).
    const standings = phaseStandings(regScores, regRounds, []).filter((r) => r.roundsPlayed > 0)
    archive = {
      phaseName: regular.def.name,
      season: regular.def.season,
      context,
      dateRange: regular.firstDate && regular.lastDate ? `${fmtDay(regular.firstDate)} al ${fmtDay(regular.lastDate)}` : '',
      matchCount: regular.matchCount,
      standings,
      fechaWinners,
      awards,
      columns,
      matrix,
    }
  }

  return { info, labels, phases, regular, playoffs, general, playoffRows, playoffScores, stages, archive }
}

export function meIn(rows: Standing[], meId: string) {
  const i = rows.findIndex((r) => r.userId === meId)
  if (i < 0) return null
  // posición con empates
  let pos = i + 1
  while (pos > 1 && rows[pos - 2].points === rows[i].points && rows[pos - 2].exacts === rows[i].exacts) pos--
  return { points: rows[i].points, exacts: rows[i].exacts, position: pos, total: rows.length }
}
