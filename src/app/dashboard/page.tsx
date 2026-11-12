import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MatchProps } from '@/components/MatchCard/MatchCard'
import LiveRefresher from '@/components/LiveRefresher/LiveRefresher'
import AutoSync from '@/components/AutoSync/AutoSync'
import DashboardSections from '@/components/DashboardSections/DashboardSections'
import NotificationBanner from '@/components/NotificationBanner/NotificationBanner'
import TopNav from '@/components/TopNav/TopNav'
import PlayoffsHero from '@/components/PlayoffsHero/PlayoffsHero'
import PhaseStandings from '@/components/Standings/PhaseStandings'
import PhaseArchive from '@/components/PhaseArchive/PhaseArchive'
import PageTabs from '@/components/PageTabs/PageTabs'
import SeasonAwards from '@/components/SeasonAwards/SeasonAwards'
import { IconBracket, IconTable, IconTrophy } from '@/components/Icons/Icons'
import { PREDICTABLE_ROUNDS } from '@/lib/prode'
import { buildScopeData, meIn } from '@/lib/phaseData'
import type { RoundScore } from '@/lib/awards'
import type { MatchRow, PredictionRow } from '@/lib/db-types'
import { VAPID_PUBLIC_KEY } from '@/lib/push/keys'

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

  const [{ data: dbMatches }, { data: predictions }, { data: leaderboard }, { data: roundScores }] = await Promise.all([
    supabase.from('matches').select('*').order('match_date', { ascending: true }),
    supabase.from('predictions').select('*').eq('user_id', user.id),
    supabase.rpc('get_leaderboard'),
    // Puntos por fecha (para tablas por fase, ganadores y premios).
    supabase.rpc('get_round_scores'),
  ])

  const board: LeaderboardRow[] = leaderboard || []
  const members = board.map((r) => ({ id: r.user_id, name: r.display_name }))
  const scores = (roundScores || []) as RoundScore[]
  const matchRows: MatchRow[] = dbMatches || []
  const pronosticos: PredictionRow[] = predictions || []

  const scope = buildScopeData({ matches: matchRows, scores, members, context: 'Ranking general' })
  const meGeneral = meIn(scope.general, user.id)
  const mePlayoffs = meIn(scope.playoffRows, user.id)

  // Ventana de predicción: las próximas PREDICTABLE_ROUNDS fechas (por su round).
  // Server Component dinámico: la hora actual es un dato de entrada legítimo,
  // se lee UNA sola vez y se reutiliza.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now()
  const upcomingRounds = Array.from(
    new Set(
      matchRows
        .filter((m) => m.status === 'pending' && new Date(m.match_date).getTime() > now)
        .map((m) => m.round)
        .filter((r): r is string => !!r)
    )
  )
    .sort()
    .slice(0, PREDICTABLE_ROUNDS)
  const predictableRounds = new Set(upcomingRounds)

  // Fechas con TODOS sus partidos finalizados (fecha cerrada). Los pronósticos
  // de los rivales solo se ven mientras la fecha NO esté cerrada.
  const roundAllFinished = new Map<string, boolean>()
  for (const m of matchRows) {
    const r = m.round
    if (!r) continue
    if (!roundAllFinished.has(r)) roundAllFinished.set(r, true)
    if (m.status !== 'finished') roundAllFinished.set(r, false)
  }

  const realMatches: MatchProps[] = matchRows.map((m) => {
    const pred = pronosticos.find((p) => p.match_id === m.id)
    const isFuturePending = m.status === 'pending' && new Date(m.match_date).getTime() > now
    return {
      id: m.id,
      homeTeam: m.home_team,
      awayTeam: m.away_team,
      homeLogo: m.home_logo ?? undefined,
      awayLogo: m.away_logo ?? undefined,
      matchDate: m.match_date,
      status: m.status,
      statusDetail: m.status_detail,
      homeScore: m.home_score ?? undefined,
      awayScore: m.away_score ?? undefined,
      featured: m.featured,
      round: m.round ?? undefined,
      roundLabel: m.round ? scope.labels[m.round] : undefined,
      predictable: isFuturePending && !!m.round && predictableRounds.has(m.round),
      fechaOpen: m.round ? roundAllFinished.get(m.round) === false : false,
      userPrediction: pred
        ? {
            home: pred.predicted_home_score,
            away: pred.predicted_away_score,
            pointsEarned: pred.points_earned ?? undefined,
          }
        : undefined,
    }
  })

  const hasLive = realMatches.some((m) => m.status === 'in_progress')
  const name = profile.display_name || user.email
  const firstName = String(name).split(' ')[0]

  const playoffs = scope.playoffs
  const tables = (
    <PageTabs
      tabs={[
        ...(playoffs
          ? [{
              key: 'playoffs',
              label: 'Playoffs',
              icon: <IconBracket />,
              gold: true,
              content: (
                <PhaseStandings
                  title="Tabla Playoffs"
                  icon={<IconBracket size={22} />}
                  subtitle="Suma desde octavos hasta la final. A igual puntaje, gana quien tenga más exactos."
                  rows={scope.playoffRows}
                  meId={user.id}
                  storyBadge="PLAYOFFS"
                  storyTitle="TABLA"
                  storyContext="Ranking general"
                  footnote="Puntos desde octavos de final · desempate por resultados exactos"
                  emptyText="Los playoffs todavía no arrancaron."
                />
              ),
            }]
          : []),
        {
          key: 'general',
          label: 'General',
          icon: <IconTable />,
          content: (
            <PhaseStandings
              title="Tabla general"
              icon={<IconTable size={22} />}
              subtitle="Todo lo jugado desde el inicio: Fase de Grupos + Playoffs."
              rows={scope.general}
              meId={user.id}
              storyBadge="TABLA GENERAL"
              storyTitle="GENERAL"
              storyContext="Ranking general"
              footnote="Fase de Grupos + Playoffs"
            />
          ),
        },
      ]}
    />
  )

  const awards = playoffs ? (
    <SeasonAwards
      scores={scope.playoffScores}
      roundOrder={[...scope.info.keys()].sort()}
      labels={scope.info}
      roundWord="ronda"
      context="general"
      title="Playoffs · Ranking general"
      badge="PLAYOFFS"
    />
  ) : (
    <SeasonAwards scores={scores} roundOrder={[...scope.info.keys()].sort()} labels={scope.info} context="general" />
  )

  return (
    <main className="animate-fade-in" style={{ padding: '0 2rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <TopNav active="inicio" />
      {/* Sincroniza al entrar/refrescar y auto-refresca si hay partidos en vivo. */}
      <AutoSync />
      <LiveRefresher active={hasLive} intervalMs={30000} />

      <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.1rem' }}>
        <div style={{ minWidth: 0 }}>
          <div className="eyebrow">Liga Profesional · Clausura 2026</div>
          <h1 className="page-title" style={{ marginTop: 4 }}>Hola, {firstName}</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {meGeneral && (
            <span className="stat-chip" title="Tabla general">
              <IconTrophy size={16} /> General <strong>#{meGeneral.position}</strong> · <strong>{meGeneral.points}</strong> pts
            </span>
          )}
        </div>
      </header>

      {playoffs && (
        <PlayoffsHero
          season={playoffs.def.season}
          stages={scope.stages}
          started={playoffs.started}
          me={mePlayoffs}
        />
      )}

      <NotificationBanner vapidPublicKey={VAPID_PUBLIC_KEY} />

      {realMatches.length > 0 ? (
        <DashboardSections
          matches={realMatches}
          labels={scope.labels}
          playoffRounds={playoffs?.rounds ?? []}
          tables={tables}
          awards={awards}
          archive={scope.archive ? <PhaseArchive data={scope.archive} meId={user.id} /> : undefined}
        />
      ) : (
        <div className="glass-panel empty-state">
          Cargando los partidos de la Liga Profesional… Si no aparecen, actualizá la página en unos segundos.
        </div>
      )}
    </main>
  )
}
