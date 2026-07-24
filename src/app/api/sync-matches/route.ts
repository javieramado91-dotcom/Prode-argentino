import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncMatches } from '@/lib/espn'

export const runtime = 'nodejs'

// Throttle global (por instancia): evita golpear ESPN en cada request, pero
// bajo para que los marcadores en vivo se refresquen seguido.
const MIN_INTERVAL_MS = 25_000
let lastSyncAt = 0

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const cronSecret = request.headers.get('x-cron-secret')
    const isCron = !!process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET
    if (!user && !isCron) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Cliente de escritura: service_role si está disponible (funciona para
    // cualquier usuario), si no la sesión (solo escribe si es admin por RLS).
    const admin = createAdminClient()
    const writer = admin ?? supabase

    // Throttle: si sincronizamos hace muy poco, no repetimos.
    const force = new URL(request.url).searchParams.get('force') === '1'
    if (!force && Date.now() - lastSyncAt < MIN_INTERVAL_MS) {
      return NextResponse.json({ skipped: true, reason: 'throttled' })
    }

    const result = await syncMatches(writer)

    if (!result.ok) {
      if (result.phase === 'espn') {
        if (result.empty) {
          return NextResponse.json({ error: 'ESPN no devolvió partidos.' }, { status: 404 })
        }
        throw result.error
      }

      // phase === 'upsert'
      const upsertError = result.error
      const msg = upsertError.message || ''
      // Usuario común sin service_role: RLS bloquea la escritura. Caso esperado,
      // no es un error (verá los datos de la última sincronización).
      if (upsertError.code === '42501' || msg.includes('row-level security') || msg.includes('permission denied')) {
        return NextResponse.json(
          { skipped: true, reason: 'sin_permisos_escritura', detail: msg },
          { status: 200 }
        )
      }
      // Columna inexistente => la migración SQL no se ejecutó todavía.
      if (upsertError.code === 'PGRST204' || upsertError.code === '42703' || msg.includes('schema cache') || msg.includes('does not exist')) {
        return NextResponse.json(
          {
            error:
              'La base de datos todavía no está migrada: ejecutá el archivo supabase/schema.sql en Supabase → SQL Editor y recargá la página.',
            detail: msg,
          },
          { status: 200 }
        )
      }
      // Índice único ausente/parcial u otro problema real: SIEMPRE visible.
      if (upsertError.code === '42P10' || msg.includes('ON CONFLICT')) {
        return NextResponse.json(
          {
            error:
              'Falta el índice único de sincronización: volvé a ejecutar supabase/schema.sql (versión actualizada) en Supabase → SQL Editor.',
            detail: msg,
          },
          { status: 200 }
        )
      }
      return NextResponse.json(
        { error: `No se pudieron guardar los partidos: ${msg}` },
        { status: 200 }
      )
    }

    lastSyncAt = Date.now()
    return NextResponse.json({ ok: true, count: result.count })
  } catch (err: any) {
    console.error('Sync Error:', err)
    return NextResponse.json({ error: 'Error interno', details: err.message }, { status: 500 })
  }
}
