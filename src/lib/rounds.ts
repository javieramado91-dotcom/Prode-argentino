export type RoundEvent = {
  id: string
  date: string
  teams: string[]
}

export type StoredRound = {
  apiId: string
  round: string | null
  // Se incluyen cuando vienen de `matches` para poder reconstruir también
  // las fechas que no están dentro de la ventana reciente de ESPN.
  date?: string | null
  teams?: string[] | null
}

// Una fecha normal tiene muchos partidos. Un round con un solo partido suele
// ser un partido reprogramado que conservó una clave vieja y no una fecha real.
const ESTABLISHED_ROUND_MIN_MATCHES = 2

/**
 * Agrupa los partidos respetando que cada equipo juega una sola vez por fecha.
 *
 * Las claves ya usadas por fechas completas tienen prioridad. Esto evita que
 * un partido adelantado/postergado cree una fecha fantasma y desplace toda la
 * numeración, pero tampoco renombra fechas consolidadas cuando la ventana de
 * ESPN empieza o termina en medio de una jornada.
 */
export function assignStableRounds(
  events: RoundEvent[],
  stored: StoredRound[] = []
): Map<string, string> {
  const roundSizes = new Map<string, number>()
  const storedByEvent = new Map<string, string>()
  const storedWithDetails = new Set<string>()
  const allEvents = new Map<string, RoundEvent>()

  for (const row of stored) {
    if (!row.apiId) continue
    if (row.round) {
      roundSizes.set(row.round, (roundSizes.get(row.round) || 0) + 1)
      storedByEvent.set(row.apiId, row.round)
    }

    if (row.date && row.teams?.length === 2) {
      allEvents.set(row.apiId, {
        id: row.apiId,
        date: row.date,
        teams: row.teams,
      })
      storedWithDetails.add(row.apiId)
    }
  }

  // Los partidos actuales tienen prioridad porque ESPN puede haber cambiado
  // su horario o sus equipos respecto de lo que estaba guardado.
  for (const event of events) allEvents.set(event.id, event)

  const sorted = [...allEvents.values()].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  const established = (round: string) =>
    (roundSizes.get(round) || 0) >= ESTABLISHED_ROUND_MIN_MATCHES

  const buckets: { teams: Set<string>; minDate: string; events: RoundEvent[] }[] = []
  for (const event of sorted) {
    let index = buckets.findIndex((bucket) =>
      event.teams.every((team) => !bucket.teams.has(team))
    )
    if (index === -1) {
      index = buckets.length
      buckets.push({ teams: new Set(), minDate: event.date, events: [] })
    }

    const bucket = buckets[index]
    event.teams.forEach((team) => bucket.teams.add(team))
    if (event.date < bucket.minDate) bucket.minDate = event.date
    bucket.events.push(event)
  }

  const result = new Map<string, string>()
  for (const bucket of buckets) {
    const votes = new Map<string, number>()
    for (const event of bucket.events) {
      const oldRound = storedByEvent.get(event.id)
      if (oldRound && established(oldRound)) {
        votes.set(oldRound, (votes.get(oldRound) || 0) + 1)
      }
    }

    const canonicalRound = [...votes.keys()].sort((a, b) =>
      (votes.get(b) || 0) - (votes.get(a) || 0) ||
      (roundSizes.get(b) || 0) - (roundSizes.get(a) || 0) ||
      a.localeCompare(b)
    )[0] || bucket.minDate.slice(0, 10)

    for (const event of bucket.events) {
      const oldRound = storedByEvent.get(event.id)
      // Los registros con fecha y equipos permiten corregir datos que quedaron
      // mal asignados en una sincronización anterior. Los casos legacy sin ese
      // contexto conservan su ronda consolidada para no alterar la estabilidad
      // que ya tenían.
      result.set(
        event.id,
        oldRound && established(oldRound) && !storedWithDetails.has(event.id)
          ? oldRound
          : canonicalRound
      )
    }
  }

  return result
}
