// Helpers de suscripción a Web Push del lado del cliente.
// Se usan tanto en el toggle del perfil como en el banner del dashboard.
import { saveSubscription } from '@/app/perfil/notify-actions'

// base64url → Uint8Array (formato que espera pushManager.subscribe).
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i)
  return out
}

export function pushSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof window !== 'undefined' &&
    'PushManager' in window &&
    'Notification' in window
  )
}

// Registra el SW (idempotente) y devuelve la suscripción actual si existe.
export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null
  const reg = await navigator.serviceWorker.register('/sw.js', {
    scope: '/',
    updateViaCache: 'none',
  })
  return reg.pushManager.getSubscription()
}

export type EnableResult = 'ok' | 'denied' | 'unsupported' | 'error'

// Pide permiso, se suscribe y guarda la suscripción en la base.
export async function enablePush(vapidPublicKey: string): Promise<EnableResult> {
  if (!pushSupported()) return 'unsupported'
  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return 'denied'
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
    })
    await saveSubscription(JSON.parse(JSON.stringify(sub)))
    return 'ok'
  } catch {
    return 'error'
  }
}
