'use client'

import { useEffect, useState } from 'react'
import {
  saveSubscription,
  removeSubscription,
  updateSettings,
  sendTestNotification,
  type NotifySettings,
} from '@/app/perfil/notify-actions'

// base64url → Uint8Array (formato que espera pushManager.subscribe).
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i)
  return out
}

type Props = {
  vapidPublicKey: string
  initialSettings: NotifySettings
}

export default function NotificationToggle({ vapidPublicKey, initialSettings }: Props) {
  const [supported, setSupported] = useState<boolean | null>(null)
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [settings, setSettings] = useState<NotifySettings>(initialSettings)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    const ok = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
    setSupported(ok)
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream)
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches)
    if (!ok) return
    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscription(sub))
      .catch(() => {})
  }, [])

  const flash = (m: string) => {
    setMsg(m)
    setTimeout(() => setMsg(null), 3500)
  }

  async function enable() {
    setBusy(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        flash('Permiso de notificaciones denegado. Activalo en los ajustes del navegador.')
        return
      }
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      })
      setSubscription(sub)
      await saveSubscription(JSON.parse(JSON.stringify(sub)))
      flash('¡Notificaciones activadas! 🔔')
    } catch (e: any) {
      flash(e?.message || 'No se pudo activar. Probá de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  async function disable() {
    setBusy(true)
    try {
      const endpoint = subscription?.endpoint
      await subscription?.unsubscribe()
      setSubscription(null)
      if (endpoint) await removeSubscription(endpoint)
      flash('Notificaciones desactivadas en este dispositivo.')
    } catch (e: any) {
      flash(e?.message || 'No se pudo desactivar.')
    } finally {
      setBusy(false)
    }
  }

  async function togglePref(key: keyof NotifySettings) {
    const next = { ...settings, [key]: !settings[key] }
    setSettings(next)
    try {
      await updateSettings(next)
    } catch {
      setSettings(settings) // revertir si falla
      flash('No se pudo guardar la preferencia.')
    }
  }

  async function test() {
    setBusy(true)
    try {
      await sendTestNotification()
      flash('Enviada. Debería llegarte en un instante.')
    } catch (e: any) {
      flash(e?.message || 'No se pudo enviar la prueba.')
    } finally {
      setBusy(false)
    }
  }

  const active = !!subscription

  return (
    <section className="glass-panel" style={{ padding: '1.5rem', marginTop: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '1.4rem' }}>🔔</span>
        <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Notificaciones</h3>
        <span
          style={{
            marginLeft: 'auto',
            fontSize: '0.75rem',
            fontWeight: 700,
            padding: '0.2rem 0.6rem',
            borderRadius: 999,
            color: active ? 'var(--color-success)' : 'var(--color-text-muted)',
            background: active ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.06)',
          }}
        >
          {active ? 'Activadas' : 'Desactivadas'}
        </span>
      </div>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: '0 0 1rem 0', lineHeight: 1.5 }}>
        Recibí avisos en tu celular cuando esté por empezar un partido y cuando termine con tus puntos.
      </p>

      {supported === false && (
        <p style={{ color: 'var(--color-warning)', fontSize: '0.9rem' }}>
          Este navegador no soporta notificaciones push.
        </p>
      )}

      {supported && isIOS && !isStandalone && (
        <p style={{ color: 'var(--color-warning)', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '1rem' }}>
          📱 En iPhone las notificaciones solo funcionan si instalás la app: tocá el botón <strong>Compartir</strong> ⎋
          y luego <strong>“Agregar a pantalla de inicio”</strong>. Después abrila desde el ícono y activá acá.
        </p>
      )}

      {supported && (
        <>
          <button
            className={active ? 'btn-ghost' : 'btn-primary'}
            onClick={active ? disable : enable}
            disabled={busy}
            style={active ? { color: 'var(--color-danger)', borderColor: 'rgba(248,113,113,0.3)' } : undefined}
          >
            {busy ? 'Un momento…' : active ? 'Desactivar en este dispositivo' : 'Activar notificaciones'}
          </button>

          {active && (
            <>
              <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <PrefRow
                  label="⚽ Partido por empezar"
                  hint="Recordatorio si todavía no cargaste tu pronóstico."
                  checked={settings.notify_match_starting}
                  onChange={() => togglePref('notify_match_starting')}
                />
                <PrefRow
                  label="🏁 Partido finalizado"
                  hint="Resultado final y cuántos puntos sumaste."
                  checked={settings.notify_match_finished}
                  onChange={() => togglePref('notify_match_finished')}
                />
              </div>

              <button
                className="btn-ghost"
                onClick={test}
                disabled={busy}
                style={{ marginTop: '1rem', fontSize: '0.85rem' }}
              >
                Enviar notificación de prueba
              </button>
            </>
          )}
        </>
      )}

      {msg && (
        <p style={{ marginTop: '1rem', marginBottom: 0, color: 'var(--color-accent)', fontSize: '0.88rem' }}>{msg}</p>
      )}
    </section>
  )
}

function PrefRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        cursor: 'pointer',
        padding: '0.75rem 0.9rem',
        borderRadius: 12,
        background: 'rgba(255,255,255,0.04)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{label}</div>
        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{hint}</div>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        style={{ width: 20, height: 20, accentColor: 'var(--color-primary)', cursor: 'pointer', flexShrink: 0 }}
      />
    </label>
  )
}
