// Qué fecha promociona el flyer de un torneo.
//
// Va en su propio módulo y SIN imports, para que los tests lo carguen directo
// (ver "Tests" en AGENTS.md: el runner no resuelve alias ni rutas sin extensión).

export type FlyerMatch = {
  id: string
  home: string
  away: string
  date: string // ISO
  status: 'pending' | 'in_progress' | 'finished'
  featured: boolean
  round: string | null
}

export type FlyerFecha = {
  round: string
  fecha: number | null // número de fecha (posición en roundOrder)
  kickoff: string // ISO del próximo partido por jugar: cuándo arranca
  started: boolean // la fecha ya empezó (quedan partidos, pero no es un estreno)
  matches: FlyerMatch[] // ordenados por hora de inicio
}

function ms(iso: string): number {
  return new Date(iso).getTime()
}

/**
 * Elige la fecha a promocionar: la primera —en orden cronológico de fechas— que
 * todavía no arrancó y tiene partidos por jugar.
 *
 * Si ninguna está intacta (pasa con los partidos postergados: la fecha ya
 * empezó pero le quedan encuentros sueltos) devuelve la primera con partidos
 * por jugar y la marca `started`, para que la placa diga "sigue" y no "arranca".
 */
export function pickFlyerFecha(
  matches: FlyerMatch[],
  roundOrder: string[],
  nowMs: number
): FlyerFecha | null {
  const byRound = new Map<string, FlyerMatch[]>()
  for (const m of matches) {
    if (!m.round) continue
    const list = byRound.get(m.round)
    if (list) list.push(m)
    else byRound.set(m.round, [m])
  }

  const candidatas = roundOrder
    .filter((round) => byRound.has(round))
    .map((round) => {
      const ordenados = [...byRound.get(round)!].sort(
        (a, b) => ms(a.date) - ms(b.date) || a.home.localeCompare(b.home, 'es')
      )
      const porJugar = ordenados.filter((m) => m.status === 'pending' && ms(m.date) > nowMs)
      // "Arrancó" es por hora de inicio, no por el estado que informe ESPN: un
      // partido que ya empezó pero sigue `pending` cuenta como empezado.
      const started = ordenados.some((m) => m.status !== 'pending' || ms(m.date) <= nowMs)
      return { round, ordenados, porJugar, started }
    })
    .filter((c) => c.porJugar.length > 0)

  const elegida = candidatas.find((c) => !c.started) ?? candidatas[0]
  if (!elegida) return null

  const idx = roundOrder.indexOf(elegida.round)
  return {
    round: elegida.round,
    fecha: idx >= 0 ? idx + 1 : null,
    kickoff: elegida.porJugar[0].date,
    started: elegida.started,
    matches: elegida.ordenados,
  }
}
