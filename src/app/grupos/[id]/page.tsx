import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import Leaderboard from '@/components/Leaderboard/Leaderboard'
import SeasonAwards from '@/components/SeasonAwards/SeasonAwards'
import AddMemberByName from '@/components/AddMemberByName/AddMemberByName'
import TournamentFechas from '@/components/TournamentFechas/TournamentFechas'
import TopNav from '@/components/TopNav/TopNav'

export const dynamic = 'force-dynamic'

type Row = { user_id: string; display_name: string; points: number }

export default async function GrupoDetallePage(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: group } = await supabase
    .from('groups')
    .select('name, invite_code, start_round')
    .eq('id', id)
    .single()

  // Si no es miembro, la RLS oculta el grupo → 404.
  if (!group) notFound()

  // Partidos (para numerar fechas, premios y las fechas en juego del torneo).
  const { data: allMatches } = await supabase
    .from('matches')
    .select('id, home_team, away_team, home_logo, away_logo, match_date, status, home_score, away_score, round')
    .order('match_date', { ascending: true })
  const matchesList = allMatches || []
  const roundOrder = Array.from(
    new Set(matchesList.map((m: any) => m.round as string).filter(Boolean))
  ).sort()

  // Número de la fecha de arranque (posición cronológica entre todas las fechas).
  let startFechaNum: number | null = null
  if (group.start_round) {
    const idx = roundOrder.indexOf(group.start_round)
    if (idx >= 0) startFechaNum = idx + 1
  }

  const { data } = await supabase.rpc('get_group_leaderboard', { gid: id })
  const rows: Row[] = data || []
  const users = rows.map((r) => ({ id: r.user_id, name: r.display_name, points: r.points }))

  // Puntos por fecha del torneo (para "Ganador de la fecha" y premios).
  const { data: roundScores } = await supabase.rpc('get_group_round_scores', { gid: id })

  // Fechas EN JUEGO: empezadas (algún partido ya arrancó) y no cerradas (algún
  // partido sin terminar). Por los postergados puede haber más de una a la vez.
  const now = Date.now()
  const roundNum = new Map(roundOrder.map((r, i) => [r, i + 1]))
  const byRound = new Map<string, any[]>()
  for (const m of matchesList) {
    if (!m.round) continue
    if (!byRound.has(m.round)) byRound.set(m.round, [])
    byRound.get(m.round)!.push(m)
  }
  const scoresList = (roundScores || []) as any[]
  const activeFechas = [...byRound.entries()]
    .filter(([, ms]) => {
      const started = ms.some((m) => m.status !== 'pending' || new Date(m.match_date).getTime() <= now)
      const open = ms.some((m) => m.status !== 'finished')
      return started && open
    })
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([round, ms]) => ({
      round,
      fecha: roundNum.get(round) ?? null,
      standings: scoresList
        .filter((s) => s.round === round)
        .map((s) => ({ name: s.display_name as string, points: Number(s.points) }))
        .sort((a, b) => b.points - a.points),
      matches: ms.map((m) => ({
        id: m.id as string,
        home: m.home_team as string,
        away: m.away_team as string,
        homeLogo: m.home_logo as string | null,
        awayLogo: m.away_logo as string | null,
        date: m.match_date as string,
        status: m.status as 'pending' | 'in_progress' | 'finished',
        homeScore: m.home_score as number | null,
        awayScore: m.away_score as number | null,
      })),
    }))

  const inviteText = encodeURIComponent(
    `⚽ ¡Sumate a mi torneo "${group.name}" en el Prode Argentino!\n\n1. Entrá a https://prode-argentino.vercel.app\n2. Registrate y andá a "Grupos"\n3. Unite con el código: ${group.invite_code}`
  )

  return (
    <main className="animate-fade-in" style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      <TopNav active="torneos" />
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="gradient-text" style={{ fontSize: 'clamp(1.5rem, 6vw, 2rem)', margin: '0 0 0.25rem 0' }}>{group.name}</h1>
          <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
            Código para invitar: <strong style={{ color: 'var(--color-accent)', letterSpacing: 1 }}>{group.invite_code}</strong>
            {startFechaNum && <> · Puntúa desde la <strong>Fecha {startFechaNum}</strong></>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <a
            href={`https://wa.me/?text=${inviteText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
            style={{ background: '#25D366', textDecoration: 'none' }}
          >
            📲 Invitar por WhatsApp
          </a>
          <Link href="/grupos" className="btn-ghost">← Mis torneos</Link>
        </div>
      </header>

      <Leaderboard title="Ranking del torneo" users={users} />

      <TournamentFechas groupId={id} groupName={group.name} fechas={activeFechas} />

      <AddMemberByName groupId={id} />

      <div style={{ marginTop: '2rem' }}>
        <SeasonAwards scores={roundScores || []} roundOrder={roundOrder} context="torneo" title={group.name} />
      </div>
    </main>
  )
}
