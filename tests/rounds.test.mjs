import assert from 'node:assert/strict'
import test from 'node:test'
import { assignStableRounds } from '../src/lib/rounds.ts'

const event = (id, date, home, away) => ({ id, date, teams: [home, away] })

test('reincorpora un partido huérfano a la fecha consolidada', () => {
  const events = [
    event('special', '2026-08-07T22:30:00Z', 'ROS', 'ALDO'),
    event('a', '2026-08-08T00:45:00Z', 'A', 'B'),
    event('b', '2026-08-08T18:00:00Z', 'C', 'D'),
  ]
  const stored = [
    { apiId: 'special', round: '2026-07-24' },
    { apiId: 'a', round: '2026-08-08' },
    { apiId: 'b', round: '2026-08-08' },
  ]

  const rounds = assignStableRounds(events, stored)

  assert.equal(rounds.get('special'), '2026-08-08')
  assert.equal(rounds.get('a'), '2026-08-08')
  assert.equal(rounds.get('b'), '2026-08-08')
})

test('no mezcla dos fechas consolidadas si la ventana empieza incompleta', () => {
  const events = [
    event('old', '2026-08-01T20:00:00Z', 'A', 'B'),
    event('next-a', '2026-08-08T20:00:00Z', 'C', 'D'),
    event('next-b', '2026-08-09T20:00:00Z', 'E', 'F'),
  ]
  const stored = [
    { apiId: 'old', round: '2026-08-01' },
    { apiId: 'old-2', round: '2026-08-01' },
    { apiId: 'next-a', round: '2026-08-08' },
    { apiId: 'next-b', round: '2026-08-08' },
  ]

  const rounds = assignStableRounds(events, stored)

  assert.equal(rounds.get('old'), '2026-08-01')
  assert.equal(rounds.get('next-a'), '2026-08-08')
  assert.equal(rounds.get('next-b'), '2026-08-08')
})

test('una fecha nueva usa la fecha de su primer partido', () => {
  const rounds = assignStableRounds([
    event('a', '2026-08-14T23:30:00Z', 'A', 'B'),
    event('b', '2026-08-15T18:00:00Z', 'C', 'D'),
  ])

  assert.equal(rounds.get('a'), '2026-08-14')
  assert.equal(rounds.get('b'), '2026-08-14')
})

test('usa el historial completo para no mezclar una fecha nueva con la anterior', () => {
  const previous = [
    event('p1', '2026-08-21T18:00:00Z', 'A', 'B'),
    event('p2', '2026-08-21T20:00:00Z', 'C', 'D'),
    event('p3', '2026-08-22T18:00:00Z', 'E', 'F'),
    event('p4', '2026-08-22T20:00:00Z', 'G', 'H'),
  ]
  const next = [
    event('n1', '2026-08-28T18:00:00Z', 'A', 'C'),
    event('n2', '2026-08-28T20:00:00Z', 'B', 'D'),
    event('n3', '2026-08-29T18:00:00Z', 'E', 'G'),
    event('n4', '2026-08-29T20:00:00Z', 'F', 'H'),
  ]

  const rounds = assignStableRounds(
    [previous[3], ...next],
    previous.map((match) => ({
      apiId: match.id,
      round: '2026-08-21',
      date: match.date,
      teams: match.teams,
    }))
  )

  assert.equal(rounds.get('p4'), '2026-08-21')
  for (const match of next) assert.equal(rounds.get(match.id), '2026-08-28')
})

test('corrige partidos que habían quedado etiquetados en la fecha anterior', () => {
  const previous = [
    event('p1', '2026-08-21T18:00:00Z', 'A', 'B'),
    event('p2', '2026-08-21T20:00:00Z', 'C', 'D'),
    event('p3', '2026-08-22T18:00:00Z', 'E', 'F'),
    event('p4', '2026-08-22T20:00:00Z', 'G', 'H'),
  ]
  const next = [
    event('n1', '2026-08-28T18:00:00Z', 'A', 'C'),
    event('n2', '2026-08-28T20:00:00Z', 'B', 'D'),
    event('n3', '2026-08-29T18:00:00Z', 'E', 'G'),
    event('n4', '2026-08-29T20:00:00Z', 'F', 'H'),
  ]

  const rounds = assignStableRounds(
    next,
    [
      ...previous.map((match) => ({
        apiId: match.id,
        round: '2026-08-21',
        date: match.date,
        teams: match.teams,
      })),
      ...next.map((match, index) => ({
        apiId: match.id,
        round: index === 0 ? '2026-08-21' : '2026-08-28',
        date: match.date,
        teams: match.teams,
      })),
    ]
  )

  for (const match of next) assert.equal(rounds.get(match.id), '2026-08-28')
})
