import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LogoMark } from '@/components/Logo/Logo'
import { IconCrown, IconHome, IconLogout, IconTrophy, IconUser } from '@/components/Icons/Icons'
import styles from './TopNav.module.css'

// Barra de la app compartida por todos los apartados: marca + navegación arriba
// (escritorio) y barra inferior tipo app (celular). Se autoabastece de datos
// (si el usuario es admin y cuántas solicitudes pendientes hay).
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

  return <TopNavView active={active} isAdmin={isAdmin} pendingCount={pendingCount} />
}

// Vista pura (sin datos): la usa TopNav y sirve para previsualizar.
export function TopNavView({
  active,
  isAdmin,
  pendingCount,
}: {
  active?: 'inicio' | 'torneos' | 'perfil' | 'admin'
  isAdmin: boolean
  pendingCount: number
}) {
  const items = [
    { key: 'inicio' as const, href: '/dashboard', label: 'Inicio', Icon: IconHome },
    { key: 'torneos' as const, href: '/grupos', label: 'Torneos', Icon: IconTrophy },
    { key: 'perfil' as const, href: '/perfil', label: 'Perfil', Icon: IconUser },
    ...(isAdmin ? [{ key: 'admin' as const, href: '/admin', label: 'Admin', Icon: IconCrown }] : []),
  ]

  return (
    <>
      <header className={styles.appbar}>
        <Link href="/dashboard" className={styles.brand} aria-label="Prode Argentino — inicio">
          <LogoMark size={34} className={styles.brandMark} />
          <span className={styles.brandText}>
            <span className={styles.brandName}>PRODE</span>
            <span className={styles.brandSub}>Fútbol Argentino</span>
          </span>
        </Link>

        <nav className={styles.links} aria-label="Principal">
          {items.map(({ key, href, label, Icon }) => (
            <Link
              key={key}
              href={href}
              className={`${styles.link} ${active === key ? styles.linkActive : ''}`}
              aria-current={active === key ? 'page' : undefined}
            >
              <Icon size={18} />
              {label}
              {key === 'admin' && pendingCount > 0 && <span className={styles.badge}>{pendingCount}</span>}
            </Link>
          ))}
        </nav>

        <form action="/auth/signout" method="post" className={styles.logoutForm}>
          <button className={styles.logout} aria-label="Cerrar sesión" title="Cerrar sesión">
            <IconLogout size={18} />
            <span className={styles.logoutText}>Salir</span>
          </button>
        </form>
      </header>

      {/* Barra inferior (celular) */}
      <nav className={styles.bottomNav} aria-label="Principal (móvil)" data-bottom-nav>
        {items.map(({ key, href, label, Icon }) => (
          <Link
            key={key}
            href={href}
            className={`${styles.bottomItem} ${active === key ? styles.bottomActive : ''}`}
            aria-current={active === key ? 'page' : undefined}
          >
            <span className={styles.bottomIcon}>
              <Icon size={22} />
              {key === 'admin' && pendingCount > 0 && <span className={styles.badge}>{pendingCount}</span>}
            </span>
            {label}
          </Link>
        ))}
      </nav>
    </>
  )
}
