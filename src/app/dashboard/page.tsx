import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { MatchProps } from '@/components/MatchCard/MatchCard'
import LiveRefresher from '@/components/LiveRefresher/LiveRefresher'
import AutoSync from '@/components/AutoSync/AutoSync'
import DashboardSections from '@/components/DashboardSections/DashboardSections'
import { LogoMark } from '@/components/Logo/Logo'
import { PREDICTABLE_ROUNDS } from '@/lib/prode'

export const dynamic = 'force-dynamic'

type LeaderboardRow = { user_id: string; display_name: string; points: number }

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile?.is_approved) redirect('/pending-approval')

  const { data: dbMatches } = await supabase
    .from('matches')
    .select('*')
    .order('match_date', { ascending: true })

  const { data: predictions } = await supabase
    .from('predictions')
    .select('*')
    .eq('user_id', user.id)

  // Solicitudes de registro pendientes (para el badge rojo del admin).
  let pendingCount = 0
  if (profile?.is_admin) {
    const { count } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('is_approved', false)
      .eq('is_admin', false)
    pendingCount = count ?? 0
  }

  const { data: leaderboard } = await supabase.rpc('get_leaderboard')
  const board: LeaderboardRow[] = leaderboard || []
  const myPoints = board.find((r) => r.user_id === user.id)?.points ?? 0
  const myPosition = board.findIndex((r) => r.user_id === user.id) + 1

  // Ventana de predicción: las próximas PREDICTABLE_ROUNDS fechas (por su round).
  const now = Date.now()
  const upcomingRounds = Array.from(
    new Set(
      (dbMatches || [])
        .filter((m: any) => m.status === 'pending' && new Date(m.match_date).getTime() > now)
        .map((m: any) => m.round as string)
    )
  )
    .sort()
    .slice(0, PREDICTABLE_ROUNDS)
  const predictableRounds = new Set(upcomingRounds)

  const realMatches: MatchProps[] = (dbMatches || []).map((m: any) => {
    const pred = predictions?.find((p: any) => p.match_id === m.id)
    const isFuturePending = m.status === 'pending' && new Date(m.match_date).getTime() > now
    return {
      id: m.id,
      homeTeam: m.home_team,
      awayTeam: m.away_team,
      homeLogo: m.home_logo,
      awayLogo: m.away_logo,
      matchDate: m.match_date,
      status: m.status,
      homeScore: m.home_score,
      awayScore: m.away_score,
      featured: m.featured,
      round: m.round,
      predictable: isFuturePending && predictableRounds.has(m.round),
      userPrediction: pred
        ? {
            home: pred.predicted_home_score,
            away: pred.predicted_away_score,
            pointsEarned: pred.points_earned,
          }
        : undefined,
    }
  })

  const hasLive = realMatches.some((m) => m.status === 'in_progress')
  const boardUsers = board.map((r) => ({ id: r.user_id, name: r.display_name, points: r.points }))

  return (
    <main className="animate-fade-in" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Sincroniza al entrar/refrescar y auto-refresca si hay partidos en vivo. */}
      <AutoSync />
      <LiveRefresher active={hasLive} intervalMs={30000} />

      <header style={{ marginBottom: '1.5rem' }}>
        {/* Barra superior: marca + puntos */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '0.9rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
            <LogoMark size={36} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <div className="gradient-text" style={{ fontSize: '1.25rem', fontWeight: 800, lineHeight: 1.15 }}>Prode Argentino</div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {profile.display_name || user.email}
                {myPosition > 0 && <> · puesto <strong style={{ color: 'var(--color-accent)' }}>#{myPosition}</strong></>}
              </div>
            </div>
          </div>
          <div className="stat-chip">
            Puntos <strong>{myPoints}</strong>
          </div>
        </div>

        {/* Navegación */}
        <nav style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Link href="/grupos" className="btn-ghost">🏆 Torneos</Link>
          <Link href="/perfil" className="btn-ghost">👤 Perfil</Link>
          {profile?.is_admin && (
            <Link href="/admin" className="btn-ghost" style={{ position: 'relative' }}>
              👑 Admin
              {pendingCount > 0 && (
                <span style={{
                  position: 'absolute', top: -7, right: -7,
                  background: 'var(--color-danger)', color: '#fff',
                  fontSize: '0.68rem', fontWeight: 800, lineHeight: 1,
                  minWidth: 18, height: 18, padding: '0 5px', borderRadius: 999,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '2px solid var(--color-bg-dark)',
                }}>
                  {pendingCount}
                </span>
              )}
            </Link>
          )}
          <form action="/auth/signout" method="post" style={{ marginLeft: 'auto' }}>
            <button className="btn-ghost" style={{ color: 'var(--color-danger)', borderColor: 'rgba(248,113,113,0.3)' }}>Salir</button>
          </form>
        </nav>
      </header>

      {realMatches.length > 0 ? (
        <DashboardSections matches={realMatches} users={boardUsers} />
      ) : (
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          Cargando los partidos de la Liga Profesional… Si no aparecen, actualizá la página en unos segundos.
        </div>
      )}
    </main>
  )
}
