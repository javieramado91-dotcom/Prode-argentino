import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

import AutoSync from '@/components/AutoSync/AutoSync'
import TopNav from '@/components/TopNav/TopNav'
import AdminTabs from './AdminTabs'
import type { MatchRow, UserRow } from '@/lib/db-types'

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

  const lista: UserRow[] = usersList || []
  const pending = lista.filter((u) => !u.is_approved && !u.is_admin)
  const approved = lista.filter((u) => u.is_approved || u.is_admin)

  // Solo los partidos de la PRÓXIMA fecha (para elegir el "Partido de la Fecha").
  const { data: allMatches } = await supabase
    .from('matches')
    .select('id, home_team, away_team, match_date, featured, status, round')
    .order('match_date', { ascending: true })

  const partidos: Pick<MatchRow, 'id' | 'home_team' | 'away_team' | 'match_date' | 'featured' | 'status' | 'round'>[] =
    allMatches || []
  // Server Component dinámico:
  // la hora actual es un dato de entrada legítimo. Se lee UNA sola vez y se
  // reutiliza, que es lo que la regla busca evitar (varias lecturas divergentes).
  // eslint-disable-next-line react-hooks/purity
  const ahora = Date.now()
  const nextRound = partidos.find(
    (m) => m.status === 'pending' && new Date(m.match_date).getTime() > ahora
  )?.round
  const matchesList = nextRound
    ? partidos.filter((m) => m.round === nextRound)
    : partidos.slice(0, 15)

  return (
    <main className="animate-fade-in" style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <TopNav active="admin" />
      <header style={{ marginBottom: '1.5rem' }}>
        <h1 className="gradient-text" style={{ fontSize: 'clamp(1.5rem, 6vw, 2rem)', margin: 0 }}>Panel de Administrador</h1>
      </header>

      {/* Sincronización automática (si falla, avisa) */}
      <AutoSync />

      <AdminTabs
        approved={approved}
        pending={pending}
        matchesList={matchesList}
      />
    </main>
  )
}
