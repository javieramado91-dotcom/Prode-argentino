// Envío de notificaciones Web Push desde el servidor (solo Node runtime).
// Requiere la clave privada VAPID en la variable de entorno VAPID_PRIVATE_KEY.
// Importa `web-push` (Node), así que solo debe usarse en código de servidor.
import webpush from 'web-push'
import { VAPID_PUBLIC_KEY, VAPID_SUBJECT } from './keys'

const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ''

// ¿Está configurado el push? (necesita la clave privada).
export function pushConfigured(): boolean {
  return !!VAPID_PRIVATE_KEY
}

let configured = false
function ensureConfigured() {
  if (configured) return
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
  configured = true
}

export type PushSub = { endpoint: string; p256dh: string; auth: string }
export type PushPayload = { title: string; body: string; url?: string; tag?: string }

// Resultado del envío a un dispositivo:
//   'ok'    → entregado a la cola de push del navegador
//   'gone'  → la suscripción murió (404/410): hay que borrarla de la base
//   'error' → otro fallo (no configurado, red, etc.)
export type SendResult = 'ok' | 'gone' | 'error'

export async function sendPush(sub: PushSub, payload: PushPayload): Promise<SendResult> {
  if (!pushConfigured()) return 'error'
  ensureConfigured()
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload)
    )
    return 'ok'
  } catch (e: any) {
    const code = e?.statusCode
    if (code === 404 || code === 410) return 'gone'
    console.error('sendPush error:', code, e?.body || e?.message)
    return 'error'
  }
}
