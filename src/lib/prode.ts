// Reglas del juego compartidas entre UI y servidor.

// Ventana de pronóstico: la fecha en curso + 3 fechas hacia adelante.
// (Se cuentan las fechas que todavía tienen partidos por jugar.)
export const PREDICTABLE_ROUNDS = 4

// Cuántas fechas finalizadas se muestran en la pestaña Resultados
// (el historial completo queda siempre en el Calendario).
export const RESULT_ROUNDS_BACK = 3
