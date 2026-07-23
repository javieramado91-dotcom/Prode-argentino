// Configuración de conexión a Supabase.
//
// Usa las variables de entorno si están definidas (recomendado en producción);
// si no, cae a los valores públicos del proyecto. La clave `sb_publishable_...`
// (anon/publishable) está DISEÑADA para ser visible en el navegador y está
// protegida por Row Level Security, por eso es seguro dejarla como valor por
// defecto. La clave secreta (service_role) nunca se usa en el cliente.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uxdnedasfycjuopplrdh.supabase.co'

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_yTGoxplxXwc5FtL2zUI5tQ_bmcQtPl4'
