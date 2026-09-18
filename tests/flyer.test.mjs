import assert from 'node:assert/strict'
import test from 'node:test'
import { pickFlyerFecha } from '../src/lib/flyer.ts'

const partido = (id, round, date, status = 'pending', featured = false) => ({
  id,
  home: `Local ${id}`,
  away: `Visita ${id}`,
  date,
  status,
  featured,
  round,
})

const AHORA = Date.parse('2026-09-18T12:00:00Z')

test('elige la próxima fecha entera y no la que ya está en juego', () => {
  const f = pickFlyerFecha(
    [
      partido('a', '2026-09-12', '2026-09-12T22:00:00Z', 'finished'),
      partido('b', '2026-09-19', '2026-09-19T23:00:00Z'),
      partido('c', '2026-09-20', '2026-09-20T22:00:00Z'),
    ],
    ['2026-09-12', '2026-09-19', '2026-09-20'],
    AHORA
  )

  assert.equal(f.round, '2026-09-19')
  assert.equal(f.fecha, 2)
  assert.equal(f.started, false)
  assert.equal(f.kickoff, '2026-09-19T23:00:00Z')
})

test('ordena los partidos por hora de inicio', () => {
  const f = pickFlyerFecha(
    [
      partido('tarde', '2026-09-19', '2026-09-19T23:30:00Z'),
      partido('temprano', '2026-09-19', '2026-09-19T18:00:00Z'),
    ],
    ['2026-09-19'],
    AHORA
  )

  assert.deepEqual(f.matches.map((m) => m.id), ['temprano', 'tarde'])
  assert.equal(f.kickoff, '2026-09-19T18:00:00Z')
})

test('si la fecha ya arrancó la marca started y apunta al próximo partido', () => {
  // Fecha con un partido jugado y un postergado: no es un estreno, pero
  // todavía hay algo que promocionar.
  const f = pickFlyerFecha(
    [
      partido('jugado', '2026-09-18', '2026-09-18T01:00:00Z', 'finished'),
      partido('postergado', '2026-09-18', '2026-09-21T22:00:00Z'),
    ],
    ['2026-09-18'],
    AHORA
  )

  assert.equal(f.started, true)
  assert.equal(f.kickoff, '2026-09-21T22:00:00Z')
})

test('un partido que ya empezó cuenta como empezado aunque ESPN lo siga dando pending', () => {
  const f = pickFlyerFecha(
    [
      partido('en-curso', '2026-09-18', '2026-09-18T11:00:00Z', 'pending'),
      partido('mas-tarde', '2026-09-18', '2026-09-18T23:00:00Z', 'pending'),
    ],
    ['2026-09-18'],
    AHORA
  )

  assert.equal(f.started, true)
})

test('devuelve null cuando no queda ningún partido por jugar', () => {
  const f = pickFlyerFecha(
    [partido('a', '2026-09-12', '2026-09-12T22:00:00Z', 'finished')],
    ['2026-09-12'],
    AHORA
  )

  assert.equal(f, null)
})

test('ignora los partidos sin fecha asignada', () => {
  const f = pickFlyerFecha(
    [
      partido('sin-round', null, '2026-09-19T20:00:00Z'),
      partido('con-round', '2026-09-20', '2026-09-20T22:00:00Z'),
    ],
    ['2026-09-20'],
    AHORA
  )

  assert.equal(f.round, '2026-09-20')
  assert.deepEqual(f.matches.map((m) => m.id), ['con-round'])
})

test('conserva el partido que vale doble', () => {
  const f = pickFlyerFecha(
    [
      partido('normal', '2026-09-19', '2026-09-19T20:00:00Z'),
      partido('doble', '2026-09-19', '2026-09-19T22:00:00Z', 'pending', true),
    ],
    ['2026-09-19'],
    AHORA
  )

  assert.deepEqual(f.matches.filter((m) => m.featured).map((m) => m.id), ['doble'])
})
