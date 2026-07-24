import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncMatches } from '@/lib/espn'
import { sendPush, pushConfigured, type PushSub, type PushPayload } from '@/lib/push/send'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Cuánto antes del inicio avisamos "partido por empezar".
const STARTING_WINDOW_MS = 3 * 60 * 60 * 1000 // 3 horas
// Solo miramos partidos finalizados recientes (el log evita reenvíos igual).
const FINISHED_LOOKBACK_MS = 2 * 24 * 60 * 60 * 1000 // 2 días
// Tope de envíos por corrida (evita timeouts del serverless).
const MAX_SENDS = 400

type Settings = { notify_match_starting: boolean; notify_match_finished: boolean }

function arTime(iso: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(new Date(iso))
}

async function authorize(request: Request): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const cronSecret = request.headers.get('x-cron-secret')
  const isCron = !!process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET
  if (isCron) return { ok: true }

  // Sin secret válido: permitimos solo a un admin logueado (para probar a mano).
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, status: 401, error: 'No autorizado' }
  const { data: profile } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { ok: false, status: 403, error: 'Prohibido' }
  return { ok: true }
}

async function handle(request: Request) {
  const auth = await authorize(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  // El envío para todos los usuarios necesita service_role (saltea RLS para leer
  // suscripciones/pronósticos de todos) y la clave privada VAPID.
  const db = createAdminClient()
  if (!db) {
    return NextResponse.json(
      { error: 'Falta SUPABASE_SERVICE_ROLE_KEY: sin ella no se pueden enviar notificaciones a todos los usuarios.' },
      { status: 200 }
    )
  }
  if (!pushConfigured()) {
    return NextResponse.json(
      { error: 'Falta VAPID_PRIVATE_KEY: configurá las claves VAPID para habilitar el push.' },
      { status: 200 }
    )
  }

  // Mantener los partidos frescos (marcadores/estados) antes de detectar. Best effort.
  try {
    await syncMatches(db)
  } catch (e) {
    console.error('notify: sync falló (se sigue igual):', e)
  }

  // --- Suscripciones y preferencias por usuario ---
  const { data: subsRows } = await db
    .from('push_subscriptions')
    .select('user_id, endpoint, p256dh, auth')
  const subsByUser = new Map<string, PushSub[]>()
  for (const r of subsRows || []) {
    const list = subsByUser.get(r.user_id) || []
    list.push({ endpoint: r.endpoint, p256dh: r.p256dh, auth: r.auth })
    subsByUser.set(r.user_id, list)
  }
  if (subsByUser.size === 0) {
    return NextResponse.json({ ok: true, sent: 0, reason: 'sin_suscripciones' })
  }

  const userIds = [...subsByUser.keys()]
  const { data: setRows } = await db
    .from('notification_settings')
    .select('user_id, notify_match_starting, notify_match_finished')
    .in('user_id', userIds)
  const settingsByUser = new Map<string, Settings>()
  for (const r of setRows || []) {
    settingsByUser.set(r.user_id, {
      notify_match_starting: r.notify_match_starting,
      notify_match_finished: r.notify_match_finished,
    })
  }
  const wants = (uid: string, key: keyof Settings) => settingsByUser.get(uid)?.[key] !== false

  // Cola de notificaciones a enviar: (usuario, partido, tipo, payload).
  const queue: { userId: string; matchId: string; kind: 'starting' | 'finished'; payload: PushPayload }[] = []

  // --- 1) Partido por empezar (a quien NO cargó pronóstico) ---
  const nowMs = Date.now()
  const { data: startingMatches } = await db
    .from('matches')
    .select('id, home_team, away_team, match_date')
    .eq('status', 'pending')
    .gt('match_date', new Date(nowMs).toISOString())
    .lte('match_date', new Date(nowMs + STARTING_WINDOW_MS).toISOString())

  const startIds = (startingMatches || []).map((m) => m.id)
  if (startIds.length > 0) {
    const [{ data: preds }, { data: logs }] = await Promise.all([
      db.from('predictions').select('user_id, match_id').in('match_id', startIds),
      db.from('notifications_log').select('user_id, match_id').eq('kind', 'starting').in('match_id', startIds),
    ])
    const predicted = new Set((preds || []).map((p) => `${p.user_id}:${p.match_id}`))
    const logged = new Set((logs || []).map((l) => `${l.user_id}:${l.match_id}`))

    for (const m of startingMatches || []) {
      for (const userId of userIds) {
        if (!wants(userId, 'notify_match_starting')) continue
        const key = `${userId}:${m.id}`
        if (predicted.has(key) || logged.has(key)) continue
        queue.push({
          userId,
          matchId: m.id,
          kind: 'starting',
          payload: {
            title: `⚽ ¡Se viene ${m.home_team} vs ${m.away_team}!`,
            body: `Empieza ${arTime(m.match_date)}. Todavía no cargaste tu pronóstico.`,
            url: '/dashboard',
            tag: `starting-${m.id}`,
          },
        })
      }
    }
  }

  // --- 2) Partido finalizado (a quien pronosticó, con sus puntos) ---
  const { data: finishedMatches } = await db
    .from('matches')
    .select('id, home_team, away_team, home_score, away_score, featured, match_date')
    .eq('status', 'finished')
    .not('home_score', 'is', null)
    .not('away_score', 'is', null)
    .gte('match_date', new Date(nowMs - FINISHED_LOOKBACK_MS).toISOString())

  const finIds = (finishedMatches || []).map((m) => m.id)
  if (finIds.length > 0) {
    const matchById = new Map((finishedMatches || []).map((m) => [m.id, m]))
    const [{ data: preds }, { data: logs }] = await Promise.all([
      db
        .from('predictions')
        .select('user_id, match_id, predicted_home_score, predicted_away_score, points_earned')
        .in('match_id', finIds)
        .not('predicted_home_score', 'is', null),
      db.from('notifications_log').select('user_id, match_id').eq('kind', 'finished').in('match_id', finIds),
    ])
    const logged = new Set((logs || []).map((l) => `${l.user_id}:${l.match_id}`))

    for (const p of preds || []) {
      if (!subsByUser.has(p.user_id)) continue
      if (!wants(p.user_id, 'notify_match_finished')) continue
      const key = `${p.user_id}:${p.match_id}`
      if (logged.has(key)) continue
      const m = matchById.get(p.match_id)
      if (!m) continue

      const mult = m.featured ? 2 : 1
      const exact = m.home_score === p.predicted_home_score && m.away_score === p.predicted_away_score
      const sameOutcome =
        Math.sign(m.home_score - m.away_score) ===
        Math.sign(p.predicted_home_score - p.predicted_away_score)
      const base = exact ? 6 : sameOutcome ? 3 : 0
      const pts = p.points_earned ?? base * mult

      const body = exact
        ? `🎯 ¡Resultado exacto! Sumaste ${pts} puntos.`
        : sameOutcome
        ? `✔ Acertaste el ganador. +${pts} puntos.`
        : 'Esta vez no sumaste. ¡La próxima! 💪'

      queue.push({
        userId: p.user_id,
        matchId: p.match_id,
        kind: 'finished',
        payload: {
          title: `🏁 ${m.home_team} ${m.home_score}-${m.away_score} ${m.away_team}`,
          body,
          url: '/dashboard',
          tag: `finished-${p.match_id}`,
        },
      })
    }
  }

  // --- Envío + limpieza de suscripciones muertas + log de idempotencia ---
  let sent = 0
  let removed = 0
  for (const item of queue) {
    if (sent >= MAX_SENDS) break
    const subs = subsByUser.get(item.userId) || []
    let attempted = false
    for (const sub of subs) {
      const r = await sendPush(sub, item.payload)
      if (r === 'ok') {
        attempted = true
        sent++
      } else if (r === 'gone') {
        attempted = true
        removed++
        await db.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
      }
    }
    // Registramos el aviso si al menos intentamos entregarlo, para no repetirlo.
    if (attempted) {
      await db
        .from('notifications_log')
        .upsert(
          { user_id: item.userId, match_id: item.matchId, kind: item.kind },
          { onConflict: 'user_id,match_id,kind', ignoreDuplicates: true }
        )
    }
  }

  return NextResponse.json({
    ok: true,
    sent,
    removed,
    queued: queue.length,
    starting: startIds.length,
    finished: finIds.length,
  })
}

export async function POST(request: Request) {
  return handle(request)
}

// GET también, para que un cron externo (cron-job.org) lo pueda pinguear fácil.
export async function GET(request: Request) {
  return handle(request)
}
