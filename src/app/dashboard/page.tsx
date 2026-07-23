import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { MatchProps } from '@/components/MatchCard/MatchCard'
import LiveRefresher from '@/components/LiveRefresher/LiveRefresher'
import AutoSync from '@/components/AutoSync/AutoSync'
import DashboardSections from '@/components/DashboardSections/DashboardSections'
import { LogoMark } from '@/components/Logo/Logo'

export const dynamic = 'force-dynamic'

// Cuántas fechas hacia adelante se pueden pronosticar.
const PREDICTABLE_ROUNDS = 3

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

      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <LogoMark size={52} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
          <div>
            <h1 className="gradient-text" style={{ fontSize: 'clamp(1.6rem, 7vw, 2.5rem)', margin: '0 0 0.25rem 0' }}>Prode Argentino</h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
              Hola, {profile.display_name || user.email}
              {myPosition > 0 && (
                <> · <strong style={{ color: 'var(--color-accent)' }}>#{myPosition}</strong></>
              )}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <div className="glass-panel" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Puntos</span>
            <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--color-accent)' }}>{myPoints}</span>
          </div>
          <Link href="/grupos" className="btn-primary" style={{ background: 'var(--color-secondary)', textDecoration: 'none' }}>👥 Grupos</Link>
          <Link href="/perfil" className="btn-primary" style={{ background: 'var(--color-secondary)', textDecoration: 'none' }}>👤 Perfil</Link>
          {profile?.is_admin && (
            <Link href="/admin" className="btn-primary" style={{ background: 'var(--color-secondary)' }}>👑 Admin</Link>
          )}
          <form action="/auth/signout" method="post">
            <button className="btn-primary" style={{ background: 'transparent', border: '1px solid var(--color-danger)', color: 'var(--color-danger)' }}>Salir</button>
          </form>
        </div>
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
