// Cálculo del "Ganador de la fecha" y los premios de la temporada, a partir de
// las filas por (fecha, usuario) que devuelven get_round_scores / get_group_round_scores.

export type RoundScore = {
  round: string
  user_id: string
  display_name: string
  points: number
  exacts: number
  is_complete: boolean
}

export type FechaWinner = {
  round: string
  fecha: number | null
  winners: string[] // nombres (puede haber empate)
  points: number
}

export type Award = {
  key: string
  icon: string
  title: string
  winnerName: string | null
  detail: string
  tie: boolean
}

// Mapa fecha (round) → número de fecha, según el orden cronológico global.
function roundNumberMap(roundOrder: string[]): Map<string, number> {
  return new Map(roundOrder.map((r, i) => [r, i + 1]))
}

// Ganador de cada fecha COMPLETA (todos los partidos finalizados). Empate = varios.
export function computeFechaWinners(scores: RoundScore[], roundOrder: string[]): FechaWinner[] {
  const nums = roundNumberMap(roundOrder)
  const byRound = new Map<string, RoundScore[]>()
  for (const s of scores) {
    if (!s.is_complete) continue
    const list = byRound.get(s.round) || []
    list.push(s)
    byRound.set(s.round, list)
  }

  const out: FechaWinner[] = []
  for (const [round, rows] of byRound) {
    const max = Math.max(...rows.map((r) => r.points))
    if (max <= 0) continue // fecha sin ningún punto: sin ganador
    // Desempate: entre los que empatan en puntos, gana el que más resultados
    // exactos clavó EN ESA FECHA. Si también empatan en exactos, comparten.
    const tied = rows.filter((r) => r.points === max)
    const maxExacts = Math.max(...tied.map((r) => r.exacts))
    const winners = tied.filter((r) => r.exacts === maxExacts).map((r) => r.display_name)
    out.push({ round, fecha: nums.get(round) ?? null, winners, points: max })
  }
  // Más recientes primero.
  out.sort((a, b) => (b.fecha ?? 0) - (a.fecha ?? 0) || b.round.localeCompare(a.round))
  return out
}

type Agg = { name: string; exacts: number; bestFecha: number }

// Premios de la temporada, calculados sobre fechas completas.
export function computeAwards(scores: RoundScore[], fechaWinners: FechaWinner[]): Award[] {
  // Agregados por usuario.
  const byUser = new Map<string, Agg>()
  for (const s of scores) {
    if (!s.is_complete) continue
    const a = byUser.get(s.user_id) || { name: s.display_name, exacts: 0, bestFecha: 0 }
    a.exacts += s.exacts
    a.bestFecha = Math.max(a.bestFecha, s.points)
    a.name = s.display_name
    byUser.set(s.user_id, a)
  }

  // 👑 Rey de las fechas: más fechas ganadas.
  const wins = new Map<string, number>()
  for (const fw of fechaWinners) {
    for (const name of fw.winners) wins.set(name, (wins.get(name) || 0) + 1)
  }
  const rey = topBy([...wins.entries()].map(([name, n]) => ({ name, value: n })))

  // 🎯 Francotirador: más resultados exactos.
  const franco = topBy(
    [...byUser.values()].filter((a) => a.exacts > 0).map((a) => ({ name: a.name, value: a.exacts }))
  )

  // 💥 Fecha récord: puntaje más alto en una sola fecha.
  const record = topBy(
    [...byUser.values()].filter((a) => a.bestFecha > 0).map((a) => ({ name: a.name, value: a.bestFecha }))
  )

  return [
    {
      key: 'rey',
      icon: '👑',
      title: 'Rey de las fechas',
      winnerName: rey?.name ?? null,
      detail: rey ? `${rey.value} ${rey.value === 1 ? 'fecha ganada' : 'fechas ganadas'}` : 'Aún sin datos',
      tie: rey?.tie ?? false,
    },
    {
      key: 'francotirador',
      icon: '🎯',
      title: 'Francotirador',
      winnerName: franco?.name ?? null,
      detail: franco ? `${franco.value} ${franco.value === 1 ? 'resultado exacto' : 'resultados exactos'}` : 'Aún sin datos',
      tie: franco?.tie ?? false,
    },
    {
      key: 'record',
      icon: '💥',
      title: 'Fecha récord',
      winnerName: record?.name ?? null,
      detail: record ? `${record.value} puntos en una fecha` : 'Aún sin datos',
      tie: record?.tie ?? false,
    },
  ]
}

// Devuelve el de mayor value; marca `tie` si hay más de uno con ese máximo.
function topBy(items: { name: string; value: number }[]): { name: string; value: number; tie: boolean } | null {
  if (items.length === 0) return null
  const max = Math.max(...items.map((i) => i.value))
  const top = items.filter((i) => i.value === max)
  return { name: top[0].name, value: max, tie: top.length > 1 }
}
