import assert from 'node:assert/strict'
import test from 'node:test'
import { computeFechaWinners } from '../src/lib/awards.ts'

const score = (round, id, name, points, exacts, isComplete = true) => ({
  round,
  user_id: id,
  display_name: name,
  points,
  exacts,
  is_complete: isComplete,
})

test('incluye la tabla completa ordenada en cada fecha cerrada', () => {
  const winners = computeFechaWinners([
    score('r1', 'a', 'Ana', 8, 1),
    score('r1', 'b', 'Beto', 8, 2),
    score('r1', 'c', 'Carla', 4, 0),
  ], ['r1'])

  assert.equal(winners.length, 1)
  assert.deepEqual(winners[0].winners, ['Beto'])
  assert.deepEqual(winners[0].standings.map(({ name, points, exacts }) => ({ name, points, exacts })), [
    { name: 'Beto', points: 8, exacts: 2 },
    { name: 'Ana', points: 8, exacts: 1 },
    { name: 'Carla', points: 4, exacts: 0 },
  ])
})

test('mantiene ganadores compartidos cuando también empatan en exactos', () => {
  const winners = computeFechaWinners([
    score('r1', 'a', 'Ana', 10, 2),
    score('r1', 'b', 'Beto', 10, 2),
  ], ['r1'])

  assert.deepEqual(winners[0].winners, ['Ana', 'Beto'])
})

test('no mezcla fechas abiertas en las mini tablas finales', () => {
  const winners = computeFechaWinners([
    score('r1', 'a', 'Ana', 5, 1),
    score('r2', 'a', 'Ana', 9, 2, false),
  ], ['r1', 'r2'])

  assert.equal(winners.length, 1)
  assert.equal(winners[0].round, 'r1')
})
