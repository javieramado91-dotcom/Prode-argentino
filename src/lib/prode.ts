// Reglas del juego compartidas entre UI y servidor.

// Ventana de pronóstico: la fecha ACTUAL + 2 fechas hacia adelante.
// (Se cuentan las fechas que todavía tienen partidos por jugar.)
export const PREDICTABLE_ROUNDS = 3

// Resultados del usuario: la fecha ACTUAL + 2 fechas hacia atrás.
// (El historial completo queda siempre en el Calendario.)
export const RESULT_ROUNDS_BACK = 2
