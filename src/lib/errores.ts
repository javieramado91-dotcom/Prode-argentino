// Sacar un mensaje legible de algo que cayó en un `catch`, sin usar `any`.
//
// En un catch el valor es `unknown`: puede ser un Error, un error de Supabase
// ({ message, status, code }), un string, o cualquier cosa. Esto lo normaliza
// en un solo lugar y devuelve el texto de respaldo cuando no hay nada útil.

export function mensajeDeError(e: unknown, respaldo = 'Ocurrió un error inesperado.'): string {
  if (typeof e === 'string' && e.trim()) return e
  if (e && typeof e === 'object') {
    const m = (e as { message?: unknown }).message
    if (typeof m === 'string' && m.trim()) return m
  }
  return respaldo
}

// Campos que traen los errores de Supabase/PostgREST, para poder mirarlos sin
// castear a `any` en cada lugar.
export type ErrorDetalles = {
  message: string
  status?: number
  code?: string
  name?: string
}

export function detallesDeError(e: unknown): ErrorDetalles {
  const o = (e && typeof e === 'object' ? e : {}) as Record<string, unknown>
  return {
    message: typeof o.message === 'string' ? o.message : '',
    status: typeof o.status === 'number' ? o.status : undefined,
    code: typeof o.code === 'string' ? o.code : undefined,
    name: typeof o.name === 'string' ? o.name : undefined,
  }
}
