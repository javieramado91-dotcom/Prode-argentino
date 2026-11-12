import assert from 'node:assert/strict'
import test from 'node:test'
import { buildRoundInfo, buildPhases, phaseStandings, standingPositions, isPlayoffRound } from '../src/lib/phases.ts'

const match = (round, status = 'finished', date = `${round}T20:00:00Z`) => ({ round, status, match_date: date })

test('numera las fechas regulares y nombra las rondas de playoffs por cantidad de partidos', () => {
  const ms = [
    ...Array.from({ length: 15 }, () => match('2026-10-30')),
    ...Array.from({ length: 15 }, () => match('2026-11-08')),
    ...Array.from({ length: 8 }, () => match('2026-11-22', 'pending')),
    ...Array.from({ length: 4 }, () => match('2026-11-29', 'pending')),
    ...Array.from({ length: 2 }, () => match('2026-12-06', 'pending')),
    match('2026-12-13', 'pending'),
  ]
  const info = buildRoundInfo(ms)
  assert.equal(info.get('2026-10-30').label, 'Fecha 1')
  assert.equal(info.get('2026-11-08').label, 'Fecha 2')
  assert.equal(info.get('2026-11-22').label, 'Octavos de final')
  assert.equal(info.get('2026-11-29').label, 'Cuartos de final')
  assert.equal(info.get('2026-12-06').label, 'Semifinales')
  assert.equal(info.get('2026-12-13').label, 'Final')
  assert.equal(isPlayoffRound('2026-11-22'), true)
  assert.equal(isPlayoffRound('2026-11-08'), false)
})

test('la fase regular queda completa y los playoffs sin empezar', () => {
  const now = Date.parse('2026-11-12T12:00:00Z')
  const phases = buildPhases([match('2026-11-08'), match('2026-11-22', 'pending', '2026-11-20T23:00:00Z')], now)
  const regular = phases.find((p) => p.def.kind === 'regular')
  const playoffs = phases.find((p) => p.def.kind === 'playoffs')
  assert.equal(regular.complete, true)
  assert.equal(playoffs.started, false)
  assert.deepEqual(playoffs.rounds, ['2026-11-22'])
})

test('la tabla de playoffs suma solo sus rondas y desempata por exactos', () => {
  const s = (round, id, points, exacts) => ({ round, user_id: id, display_name: id, points, exacts, is_complete: true })
  const scores = [
    s('2026-11-08', 'ana', 40, 3), // fase regular: no cuenta
    s('2026-11-22', 'ana', 12, 1),
    s('2026-11-22', 'beto', 12, 2),
    s('2026-11-29', 'carla', 6, 1),
  ]
  const rows = phaseStandings(scores, ['2026-11-22', '2026-11-29'], [
    { id: 'ana', name: 'ana' },
    { id: 'beto', name: 'beto' },
    { id: 'carla', name: 'carla' },
    { id: 'dani', name: 'dani' },
  ])
  assert.deepEqual(rows.map((r) => [r.name, r.points, r.exacts]), [
    ['beto', 12, 2],
    ['ana', 12, 1],
    ['carla', 6, 1],
    ['dani', 0, 0],
  ])
  assert.deepEqual(standingPositions(rows), [1, 2, 3, 4])
  assert.deepEqual(standingPositions([{ points: 5, exacts: 1 }, { points: 5, exacts: 1 }, { points: 3, exacts: 0 }]), [1, 1, 3])
})
