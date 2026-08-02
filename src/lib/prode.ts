// Reglas del juego compartidas entre UI y servidor.

// Ventana de pronóstico: la fecha ACTUAL + 2 fechas hacia adelante.
// (Se cuentan las fechas que todavía tienen partidos por jugar.)
export const PREDICTABLE_ROUNDS = 3

// Nota: la pestaña Resultados NO usa ventana: muestra todo el historial de
// partidos jugados (el Calendario ya no lista las fechas transcurridas).
