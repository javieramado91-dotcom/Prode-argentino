import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL } from './config'

/**
 * Cliente con service_role: SOLO para el servidor (nunca el navegador).
 * Saltea RLS, así la sincronización de partidos puede escribir sin una sesión
 * de admin. Devuelve null si no está configurada la variable, para poder
 * degradar con elegancia (la sync manual del admin sigue funcionando).
 *
 * Configurar en Vercel / .env.local: SUPABASE_SERVICE_ROLE_KEY
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) return null
  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
