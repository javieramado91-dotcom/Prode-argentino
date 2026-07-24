'use server'

import { createClient } from '@/lib/supabase/server'
import { sendPush, pushConfigured } from '@/lib/push/send'

export type NotifySettings = {
  notify_match_starting: boolean
  notify_match_finished: boolean
}

const DEFAULT_SETTINGS: NotifySettings = {
  notify_match_starting: true,
  notify_match_finished: true,
}

// Navegador → suscripción serializada (JSON.parse(JSON.stringify(pushSub))).
type SerializedSub = {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Debés iniciar sesión.')
  return { supabase, user }
}

// Guarda (o actualiza) la suscripción de ESTE dispositivo y garantiza que exista
// la fila de preferencias del usuario (con los valores por defecto).
export async function saveSubscription(sub: SerializedSub) {
  const { supabase, user } = await requireUser()

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    },
    { onConflict: 'endpoint' }
  )
  if (error) {
    console.error('saveSubscription:', error.message)
    throw new Error('No se pudo guardar la suscripción.')
  }

  await supabase
    .from('notification_settings')
    .upsert({ user_id: user.id }, { onConflict: 'user_id', ignoreDuplicates: true })

  return { ok: true }
}

// Borra la suscripción de este dispositivo (desactivar en este navegador).
export async function removeSubscription(endpoint: string) {
  const { supabase, user } = await requireUser()
  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint)
    .eq('user_id', user.id)
  if (error) {
    console.error('removeSubscription:', error.message)
    throw new Error('No se pudo desactivar la suscripción.')
  }
  return { ok: true }
}

export async function getSettings(): Promise<NotifySettings> {
  const { supabase, user } = await requireUser()
  const { data } = await supabase
    .from('notification_settings')
    .select('notify_match_starting, notify_match_finished')
    .eq('user_id', user.id)
    .single()
  return data ?? DEFAULT_SETTINGS
}

export async function updateSettings(prefs: NotifySettings) {
  const { supabase, user } = await requireUser()
  const { error } = await supabase.from('notification_settings').upsert(
    {
      user_id: user.id,
      notify_match_starting: prefs.notify_match_starting,
      notify_match_finished: prefs.notify_match_finished,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )
  if (error) {
    console.error('updateSettings:', error.message)
    throw new Error('No se pudieron guardar las preferencias.')
  }
  return { ok: true }
}

// Envía una notificación de prueba a todos los dispositivos del usuario, para
// que pueda confirmar en el momento que las notificaciones llegan bien.
export async function sendTestNotification() {
  const { supabase, user } = await requireUser()

  if (!pushConfigured()) {
    throw new Error(
      'Las notificaciones todavía no están configuradas en el servidor (falta la clave VAPID_PRIVATE_KEY).'
    )
  }

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', user.id)

  if (!subs || subs.length === 0) {
    throw new Error('No hay ningún dispositivo suscripto para este usuario.')
  }

  const payload = {
    title: '🔔 Prueba de notificación',
    body: '¡Listo! Vas a recibir avisos de los partidos acá.',
    url: '/dashboard',
    tag: 'test',
  }

  let delivered = 0
  for (const s of subs) {
    const r = await sendPush(s, payload)
    if (r === 'ok') delivered++
    // Suscripción muerta: la limpiamos.
    if (r === 'gone') {
      await supabase.from('push_subscriptions').delete().eq('endpoint', s.endpoint).eq('user_id', user.id)
    }
  }

  if (delivered === 0) {
    throw new Error('No se pudo entregar la notificación de prueba. Probá volver a activarla.')
  }
  return { ok: true, delivered }
}
