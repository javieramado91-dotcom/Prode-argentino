import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

// Menú de navegación compartido para todos los apartados (Perfil, Torneos,
// Admin, etc.). Muestra accesos directos a las secciones principales para
// facilitar moverse por la página desde cualquier lado. Se autoabastece de
// datos (si el usuario es admin y cuántas solicitudes pendientes hay).
export default async function TopNav({
  active,
}: {
  active?: 'inicio' | 'torneos' | 'perfil' | 'admin'
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  const isAdmin = !!profile?.is_admin

  let pendingCount = 0
  if (isAdmin) {
    const { count } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('is_approved', false)
      .eq('is_admin', false)
    pendingCount = count ?? 0
  }

  const items: { key: NonNullable<typeof active>; href: string; label: string }[] = [
    { key: 'inicio', href: '/dashboard', label: '🏠 Inicio' },
    { key: 'torneos', href: '/grupos', label: '🏆 Torneos' },
    { key: 'perfil', href: '/perfil', label: '👤 Perfil' },
  ]

  const activeStyle = {
    borderColor: 'var(--color-accent)',
    color: 'var(--color-accent)',
    fontWeight: 700,
  } as const

  return (
    <nav style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
      {items.map((it) => (
        <Link
          key={it.key}
          href={it.href}
          className="btn-ghost"
          aria-current={active === it.key ? 'page' : undefined}
          style={active === it.key ? activeStyle : undefined}
        >
          {it.label}
        </Link>
      ))}

      {isAdmin && (
        <Link
          href="/admin"
          className="btn-ghost"
          aria-current={active === 'admin' ? 'page' : undefined}
          style={{ position: 'relative', ...(active === 'admin' ? activeStyle : {}) }}
        >
          👑 Admin
          {pendingCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: -7,
                right: -7,
                background: 'var(--color-danger)',
                color: '#fff',
                fontSize: '0.68rem',
                fontWeight: 800,
                lineHeight: 1,
                minWidth: 18,
                height: 18,
                padding: '0 5px',
                borderRadius: 999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid var(--color-bg-dark)',
              }}
            >
              {pendingCount}
            </span>
          )}
        </Link>
      )}

      <form action="/auth/signout" method="post" style={{ marginLeft: 'auto' }}>
        <button
          className="btn-ghost"
          style={{ color: 'var(--color-danger)', borderColor: 'rgba(248,113,113,0.3)' }}
        >
          Salir
        </button>
      </form>
    </nav>
  )
}
