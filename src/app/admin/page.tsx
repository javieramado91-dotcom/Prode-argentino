import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

import AutoSync from '@/components/AutoSync/AutoSync'
import AdminTabs from './AdminTabs'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) redirect('/dashboard')

  const { data: usersList } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })

  const pending = (usersList || []).filter((u: any) => !u.is_approved && !u.is_admin)
  const approved = (usersList || []).filter((u: any) => u.is_approved || u.is_admin)

  // Solo los partidos de la PRÓXIMA fecha (para elegir el "Partido de la Fecha").
  const { data: allMatches } = await supabase
    .from('matches')
    .select('id, home_team, away_team, match_date, featured, status, round')
    .order('match_date', { ascending: true })

  const nextRound = allMatches?.find(
    (m: any) => m.status === 'pending' && new Date(m.match_date).getTime() > Date.now()
  )?.round
  const matchesList = nextRound
    ? allMatches?.filter((m: any) => m.round === nextRound)
    : allMatches?.slice(0, 15)

  return (
    <main className="animate-fade-in" style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 className="gradient-text" style={{ fontSize: 'clamp(1.5rem, 6vw, 2rem)', margin: 0 }}>Panel de Administrador</h1>
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <Link href="/dashboard" className="btn-ghost">🏠 Inicio</Link>
          <form action="/auth/signout" method="post">
            <button className="btn-ghost" style={{ color: 'var(--color-danger)', borderColor: 'rgba(248,113,113,0.3)' }}>Salir</button>
          </form>
        </div>
      </header>

      {/* Sincronización automática (si falla, avisa) */}
      <AutoSync />

      <AdminTabs
        approved={approved}
        pending={pending}
        matchesList={matchesList || []}
      />
    </main>
  )
}
