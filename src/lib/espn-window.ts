// Qué le pedimos a ESPN en cada sincronización.
//
// Va en su propio módulo, sin imports, para que los tests lo puedan cargar
// directo (igual que rounds.ts): el runner usa --experimental-strip-types y no
// resuelve los alias ni las rutas sin extensión que tiene espn.ts.

// Ventana a sincronizar: partidos recientes + en curso + próximas fechas.
export const DAYS_BACK = 10
export const DAYS_AHEAD = 28

// Se pide por MES (`dates=YYYYMM`), no por rango de días.
//
// ESPN dejó de aceptar `dates=DESDE-HASTA`: desde 2026-09-17 devuelve 400 para
// CUALQUIER rango, hasta para uno de dos días. Verificado a mano contra la API;
// era lo que tenía el sync caído en producción ("Error interno" en el
// dashboard). La forma por mes trae ≈45-60 partidos —bien lejos del tope de 100
// eventos por consulta— y son 2-3 pedidos, los mismos que hacía el troceado.
//
// Devuelve los meses que toca la ventana [hoy-DAYS_BACK, hoy+DAYS_AHEAD],
// consecutivos y sin huecos, incluso cruzando el cambio de año.
export function windowMonths(now: Date): string[] {
  const from = new Date(now.getTime() - DAYS_BACK * 86400000)
  const to = new Date(now.getTime() + DAYS_AHEAD * 86400000)

  const months: string[] = []
  const cur = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1))
  const end = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1)
  while (cur.getTime() <= end) {
    months.push(`${cur.getUTCFullYear()}${String(cur.getUTCMonth() + 1).padStart(2, '0')}`)
    cur.setUTCMonth(cur.getUTCMonth() + 1)
  }
  return months
}
