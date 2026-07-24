'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { pushSupported, getExistingSubscription, enablePush } from '@/lib/push/subscribe'

const DISMISS_KEY = 'prode-notif-banner-dismissed'

// Banner discreto que invita a activar las notificaciones. Aparece solo si:
// el navegador soporta push, el usuario NO está suscripto todavía, no bloqueó
// el permiso, y no lo cerró antes. Al activar o cerrar, no vuelve a molestar.
export default function NotificationBanner({ vapidPublicKey }: { vapidPublicKey: string }) {
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [iosHint, setIosHint] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!pushSupported()) return
    if (localStorage.getItem(DISMISS_KEY)) return
    if (Notification.permission === 'denied') return

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    const standalone = window.matchMedia('(display-mode: standalone)').matches
    setIosHint(isIOS && !standalone)

    getExistingSubscription()
      .then((sub) => {
        if (!sub) setShow(true)
      })
      .catch(() => {})
  }, [])

  if (!show) return null

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, '1') } catch {}
    setShow(false)
  }

  const activate = async () => {
    setBusy(true)
    setError(null)
    const r = await enablePush(vapidPublicKey)
    setBusy(false)
    if (r === 'ok') {
      dismiss()
    } else if (r === 'denied') {
      setError('Permiso denegado. Podés activarlo desde los ajustes del navegador.')
    } else {
      setError('No se pudo activar. Probá desde Perfil → Notificaciones.')
    }
  }

  return (
    <div
      className="glass-panel animate-fade-in"
      style={{
        padding: '0.9rem 1.1rem',
        marginBottom: '1.25rem',
        borderColor: 'var(--color-accent)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.9rem',
        flexWrap: 'wrap',
      }}
    >
      <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>🔔</span>

      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontWeight: 700, fontSize: '0.98rem' }}>Activá las notificaciones</div>
        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.84rem', lineHeight: 1.45 }}>
          {iosHint
            ? 'En iPhone: tocá Compartir ⎋ → “Agregar a pantalla de inicio”, abrila desde el ícono y activalas desde tu Perfil.'
            : 'Enterate cuando esté por empezar un partido y cuando termine con tus puntos.'}
        </div>
        {error && (
          <div style={{ color: 'var(--color-warning)', fontSize: '0.8rem', marginTop: '0.35rem' }}>{error}</div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
        {iosHint ? (
          <Link href="/perfil" className="btn-ghost" style={{ fontSize: '0.85rem' }}>
            Ver Perfil
          </Link>
        ) : (
          <button className="btn-primary" onClick={activate} disabled={busy} style={{ fontSize: '0.85rem' }}>
            {busy ? 'Activando…' : 'Activar'}
          </button>
        )}
        <button
          onClick={dismiss}
          aria-label="Cerrar"
          className="btn-ghost"
          style={{ padding: '0.35rem 0.6rem', fontSize: '1rem', lineHeight: 1 }}
        >
          ✕
        </button>
      </div>
    </div>
  )
}
