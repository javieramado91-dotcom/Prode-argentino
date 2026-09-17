import test from 'node:test'
import assert from 'node:assert/strict'
import { windowMonths } from '../src/lib/espn-window.ts'

// La ventana es [hoy-10, hoy+28]. windowMonths tiene que devolver todos los
// meses que toca, consecutivos y sin huecos, para que el sync no pierda una
// fecha entera al cruzar el borde del mes.

test('cubre el mes de inicio y el de fin', () => {
  assert.deepEqual(windowMonths(new Date('2026-09-17T12:00:00Z')), ['202609', '202610'])
})

test('incluye el mes anterior cuando la ventana arranca ahí', () => {
  // 2026-10-05 menos 10 días cae en septiembre; más 28 días, en noviembre.
  assert.deepEqual(windowMonths(new Date('2026-10-05T12:00:00Z')), ['202609', '202610', '202611'])
})

test('cruza el cambio de año sin saltearse enero', () => {
  // 2026-12-28 menos 10 días = diciembre; más 28 días = 2027-01-25.
  assert.deepEqual(windowMonths(new Date('2026-12-28T12:00:00Z')), ['202612', '202701'])
})

test('nunca deja huecos entre meses consecutivos', () => {
  for (let dia = 1; dia <= 365; dia += 7) {
    const now = new Date(Date.UTC(2026, 0, dia, 12))
    const meses = windowMonths(now)
    assert.ok(meses.length >= 2, `${now.toISOString()} devolvió ${meses.length} mes(es)`)
    for (let i = 1; i < meses.length; i++) {
      const [a, b] = [meses[i - 1], meses[i]].map((m) => ({
        y: Number(m.slice(0, 4)),
        m: Number(m.slice(4)),
      }))
      const saltoEnMeses = (b.y - a.y) * 12 + (b.m - a.m)
      assert.equal(saltoEnMeses, 1, `hueco entre ${meses[i - 1]} y ${meses[i]}`)
    }
  }
})

test('la ventana entera queda dentro de los meses devueltos', () => {
  for (let dia = 1; dia <= 365; dia += 11) {
    const now = new Date(Date.UTC(2026, 0, dia, 12))
    const meses = new Set(windowMonths(now))
    for (const offset of [-10, 0, 28]) {
      const d = new Date(now.getTime() + offset * 86400000)
      const clave = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}`
      assert.ok(meses.has(clave), `${clave} (offset ${offset}) falta para ${now.toISOString()}`)
    }
  }
})
