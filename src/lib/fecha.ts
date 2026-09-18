// Formateo de fechas y horas, SIEMPRE en hora de Argentina.
//
// Por qué existe este archivo: un `new Intl.DateTimeFormat('es-AR', …)` sin
// `timeZone` usa la zona del proceso que lo ejecuta. En Vercel el servidor
// corre en UTC y el celular del usuario está en UTC-3, así que el mismo
// partido se renderizaba distinto de los dos lados:
//
//   UTC                              dom, 20 sept, 12:30 a. m.
//   America/Argentina/Buenos_Aires   sáb, 19 sept, 09:30 p. m.
//
// Otro día y otra hora. En los componentes cliente eso es un desajuste de
// hidratación (React descarta el HTML del servidor y hay parpadeo); en los
// componentes server es directamente la etiqueta equivocada. Fijar la zona
// resuelve las dos cosas y deja la app mostrando la hora del partido.

export const TZ_AR = 'America/Argentina/Buenos_Aires'

function fmt(options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('es-AR', { ...options, timeZone: TZ_AR })
}

// "sáb, 19 sept, 09:30 p. m." — tarjeta de partido.
export function fechaHoraLarga(iso: string): string {
  return fmt({
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

// "19 sept, 09:30 p. m." — fila de partido dentro de un torneo.
export function fechaHoraCorta(iso: string): string {
  return fmt({
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

// "19 sept" — rangos de fecha y etiquetas de fecha del campeonato.
export function diaMes(iso: string | Date): string {
  return fmt({ day: 'numeric', month: 'short' }).format(
    typeof iso === 'string' ? new Date(iso) : iso
  )
}

// "19 de septiembre de 2026, 21:30" — panel de admin.
export function fechaCompleta(iso: string): string {
  return fmt({
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

// "2026-09-19" en hora argentina. Sirve para saber si dos partidos caen el
// mismo día PARA UN ARGENTINO (toDateString() usaría la zona del proceso).
// Se arma con formatToParts porque es-AR formatea como "19/09/2026".
export function diaAR(iso: string | Date): string {
  const parts = fmt({ year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(
    typeof iso === 'string' ? new Date(iso) : iso
  )
  const get = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

// "Viernes 19 de septiembre" — titular de las placas promocionales.
//
// Se arma por partes y no con el string que devuelve Intl ("viernes, 19 de
// septiembre") por dos detalles que se notan en una imagen: la coma sobra en un
// titular, y la mayúscula inicial no se puede pedir con `text-transform:
// capitalize` porque eso también capitaliza el "de" ("19 De Septiembre").
export function diaLargo(iso: string | Date): string {
  const parts = fmt({ weekday: 'long', day: 'numeric', month: 'long' }).formatToParts(
    typeof iso === 'string' ? new Date(iso) : iso
  )
  const get = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)?.value ?? ''
  const dia = get('weekday')
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} ${get('day')} de ${get('month')}`
}

// "21:15" — hora sola. Las placas van en 24 h: "09:15 p. m." ocupa el doble y
// queda feo en una imagen. `hourCycle: 'h23'` y no `hour12: false` porque este
// último devuelve "24:15" para la medianoche en algunos motores.
export function hora24(iso: string | Date): string {
  return fmt({ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(
    typeof iso === 'string' ? new Date(iso) : iso
  )
}

// "vie, 19 sept · 21:15" — filas de partido dentro de una placa.
export function diaHora24(iso: string | Date): string {
  const d = fmt({ weekday: 'short', day: 'numeric', month: 'short' }).format(
    typeof iso === 'string' ? new Date(iso) : iso
  )
  return `${d} · ${hora24(iso)}`
}
