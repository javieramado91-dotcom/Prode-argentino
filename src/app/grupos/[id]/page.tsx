import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import SeasonAwards from '@/components/SeasonAwards/SeasonAwards'
import AddMemberByName from '@/components/AddMemberByName/AddMemberByName'
import TournamentFechas from '@/components/TournamentFechas/TournamentFechas'
import TournamentRanking from '@/components/TournamentRanking/TournamentRanking'
import TournamentFlyer from '@/components/TournamentFlyer/TournamentFlyer'
import type { FlyerData } from '@/components/TournamentFlyer/FlyerStoryCard'
import RenewTournament from '@/components/RenewTournament/RenewTournament'
import DeleteTournament from '@/components/DeleteTournament/DeleteTournament'
import TopNav from '@/components/TopNav/TopNav'
import PlayoffsHero from '@/components/PlayoffsHero/PlayoffsHero'
import PlayoffsHeroGate from '@/components/PlayoffsHero/PlayoffsHeroGate'
import { HERO_COOKIE } from '@/components/PlayoffsHero/heroCookie'
import { cookies } from 'next/headers'
import PhaseStandings from '@/components/Standings/PhaseStandings'
import PhaseArchive from '@/components/PhaseArchive/PhaseArchive'
import PageTabs from '@/components/PageTabs/PageTabs'
import { IconArchive, IconArrowRight, IconBracket, IconTable, IconUsers, IconWhatsapp } from '@/components/Icons/Icons'
import { buildScopeData, meIn } from '@/lib/phaseData'
import { computeFechaWinners, type RoundScore } from '@/lib/awards'
import type { MatchRow } from '@/lib/db-types'
import { pickFlyerFecha } from '@/lib/flyer'

// Las columnas que pide esta página de `matches`.
type PartidoDeTorneo = Omit<MatchRow, 'api_id' | 'status_detail'>

export const dynamic = 'force-dynamic'

type Row = { user_id: string; display_name: string; points: number }

export default async function GrupoDetallePage(props: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { id } = await props.params
  const { error: errorMsg } = await props.searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: group } = await supabase
    .from('groups')
    .select('name, invite_code, start_round, owner_id')
    .eq('id', id)
    .single()

  // Si no es miembro, la RLS oculta el grupo → 404.
  if (!group) notFound()

  const [{ data: allMatches }, { data }, { data: roundScores }] = await Promise.all([
    supabase
      .from('matches')
      .select('id, home_team, away_team, home_logo, away_logo, match_date, status, home_score, away_score, round, featured')
      .order('match_date', { ascending: true }),
    supabase.rpc('get_group_leaderboard', { gid: id }),
    // Puntos por fecha del torneo (respeta la fecha de arranque del grupo).
    supabase.rpc('get_group_round_scores', { gid: id }),
  ])
  const matchesList: PartidoDeTorneo[] = allMatches || []
  const memberRows: Row[] = data || []
  const members = memberRows.map((r) => ({ id: r.user_id, name: r.display_name }))
  const scores = (roundScores || []) as RoundScore[]

  const scope = buildScopeData({ matches: matchesList, scores, members, context: group.name })
  const roundOrder = [...scope.info.keys()].sort()
  const playoffs = scope.playoffs
  const mePlayoffs = meIn(scope.playoffRows, user.id)
  const heroHidden = (await cookies()).get(HERO_COOKIE)?.value === 'hidden'

  // Etiqueta de la fecha de arranque del torneo.
  const startLabel = group.start_round ? scope.labels[group.start_round] ?? null : null

  // Estado del torneo argentino / del torneo de amigos.
  // "Terminó" = no quedan partidos sin finalizar (ESPN no da un flag de fin).
  const maxRound = roundOrder[roundOrder.length - 1] || null
  const tournamentEnded = matchesList.length > 0 && matchesList.every((m) => m.status === 'finished')
  const groupStarted = !group.start_round || (maxRound !== null && group.start_round <= maxRound)
  const finalized = tournamentEnded && groupStarted
  const waiting = tournamentEnded && !groupStarted
  const isOwner = group.owner_id === user.id

  // Rondas EN JUEGO: empezadas (algún partido ya arrancó) y no cerradas (algún
  // partido sin terminar). Por los postergados puede haber más de una a la vez.
  // Server Component dinámico: la hora actual es un dato de entrada legítimo,
  // se lee UNA sola vez y se reutiliza.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now()
  const byRound = new Map<string, PartidoDeTorneo[]>()
  for (const m of matchesList) {
    if (!m.round) continue
    if (!byRound.has(m.round)) byRound.set(m.round, [])
    byRound.get(m.round)!.push(m)
  }
  const activeFechas = [...byRound.entries()]
    .filter(([, ms]) => {
      const started = ms.some((m) => m.status !== 'pending' || new Date(m.match_date).getTime() <= now)
      const open = ms.some((m) => m.status !== 'finished')
      return started && open
    })
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([round, ms]) => ({
      round,
      fecha: scope.info.get(round)?.number ?? null,
      label: scope.labels[round] ?? 'Fecha',
      standings: scores
        .filter((s) => s.round === round)
        .map((s) => ({
          name: s.display_name,
          points: Number(s.points),
          exacts: Number(s.exacts ?? 0),
        }))
        // Desempate: a igual puntaje, primero el que tiene más exactos EN ESA FECHA.
        .sort((a, b) => b.points - a.points || b.exacts - a.exacts || a.name.localeCompare(b.name)),
      matches: ms.map((m) => ({
        id: m.id,
        home: m.home_team,
        away: m.away_team,
        homeLogo: m.home_logo,
        awayLogo: m.away_logo,
        date: m.match_date,
        status: m.status,
        homeScore: m.home_score,
        awayScore: m.away_score,
      })),
    }))

  // Flyer promocional de la fecha/ronda que viene. Solo mira las fechas en las
  // que este torneo puntúa: si arranca más adelante, promocionar la de mañana
  // sería mentira.
  const proxima = pickFlyerFecha(
    matchesList
      .filter((m) => !group.start_round || (m.round !== null && m.round >= group.start_round))
      .map((m) => ({
        id: m.id,
        home: m.home_team,
        away: m.away_team,
        date: m.match_date,
        status: m.status,
        featured: m.featured,
        round: m.round,
      })),
    roundOrder,
    now
  )
  const ultimoGanador = computeFechaWinners(scores, roundOrder, scope.info)[0] ?? null
  const flyerData: FlyerData | null = proxima
    ? {
        groupName: group.name,
        fechaLabel: scope.labels[proxima.round] ?? 'Próxima fecha',
        started: proxima.started,
        kickoff: proxima.kickoff,
        matches: proxima.matches.map((m) => ({
          id: m.id,
          home: m.home,
          away: m.away,
          date: m.date,
          featured: m.featured,
        })),
        lastWinner: ultimoGanador
          ? { fechaLabel: ultimoGanador.label, names: ultimoGanador.winners, points: ultimoGanador.points }
          : null,
        inviteCode: group.invite_code,
      }
    : null

  const inviteText = encodeURIComponent(
    `⚽ ¡Sumate a mi torneo "${group.name}" en el Prode Argentino!\n\n1. Entrá a https://prode-argentino.vercel.app\n2. Registrate y andá a "Torneos"\n3. Unite con el código: ${group.invite_code}`
  )

  const playoffsTab = playoffs
    ? {
        key: 'playoffs',
        label: 'Playoffs',
        icon: <IconBracket />,
        gold: true,
        content: (
          <>
            <PhaseStandings
              title="Tabla Playoffs"
              icon={<IconBracket size={22} />}
              subtitle="Suma desde octavos hasta la final. A igual puntaje, gana quien tenga más exactos."
              rows={scope.playoffRows}
              meId={user.id}
              storyBadge="PLAYOFFS"
              storyTitle="TABLA"
              storyContext={group.name}
              footnote="Puntos desde octavos de final · desempate por resultados exactos"
              emptyText="Los playoffs todavía no arrancaron."
            />
            <TournamentFechas groupId={id} groupName={group.name} fechas={activeFechas} />
            <TournamentFlyer data={flyerData} />
            <div style={{ marginTop: '2rem' }}>
              <SeasonAwards
                scores={scope.playoffScores}
                roundOrder={roundOrder}
                labels={scope.info}
                roundWord="ronda"
                context="torneo"
                title={`${group.name} · Playoffs`}
                badge="PLAYOFFS"
              />
            </div>
          </>
        ),
      }
    : null

  return (
    <main className="animate-fade-in" style={{ padding: '0 2rem 2rem', maxWidth: '980px', margin: '0 auto' }}>
      <TopNav active="torneos" />

      <Link href="/grupos" className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.88rem', minHeight: 32 }}>
        <IconArrowRight size={16} style={{ transform: 'rotate(180deg)' }} /> Mis torneos
      </Link>

      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', margin: '0.35rem 0 1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ minWidth: 0 }}>
          <div className="eyebrow">Torneo de amigos</div>
          <h1 className="page-title" style={{ margin: '4px 0 0.4rem', overflowWrap: 'anywhere' }}>{group.name}</h1>
          <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
            <span className="tag tag-celeste">Código {group.invite_code}</span>
            <span className="tag"><IconUsers /> {members.length} jugadores</span>
            {startLabel && <span className="tag">Desde la {startLabel}</span>}
          </div>
        </div>
        <a
          href={`https://wa.me/?text=${inviteText}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary"
          style={{ background: 'linear-gradient(135deg, #1fb855, #25D366)' }}
        >
          <IconWhatsapp /> Invitar
        </a>
      </header>

      {errorMsg && (
        <div className="glass-panel" style={{ padding: '0.85rem 1.1rem', marginBottom: '1.25rem', borderColor: 'var(--color-danger)', color: 'var(--color-danger)', fontSize: '0.9rem' }}>
          {errorMsg}
        </div>
      )}

      <RenewTournament groupId={id} finalized={finalized} waiting={waiting} isOwner={isOwner} />

      {playoffs && (
        <PlayoffsHeroGate initialHidden={heroHidden}>
          <PlayoffsHero
            season={playoffs.def.season}
            stages={scope.stages}
            started={playoffs.started}
            me={mePlayoffs}
            context={group.name}
          />
        </PlayoffsHeroGate>
      )}

      <PageTabs
        sticky
        tabs={[
          ...(playoffsTab ? [playoffsTab] : []),
          {
            key: 'general',
            label: 'General',
            icon: <IconTable />,
            content: (
              <>
                <TournamentRanking
                  groupId={id}
                  groupName={group.name}
                  rows={scope.general}
                  labels={scope.labels}
                  playoffRounds={playoffs?.rounds ?? []}
                  meId={user.id}
                />
                {!playoffs && <TournamentFechas groupId={id} groupName={group.name} fechas={activeFechas} />}
                {!playoffs && <TournamentFlyer data={flyerData} />}
              </>
            ),
          },
          ...(scope.archive
            ? [{
                key: 'grupos',
                label: 'Fase de Grupos',
                icon: <IconArchive />,
                content: <PhaseArchive data={scope.archive} meId={user.id} />,
              }]
            : []),
          {
            key: 'miembros',
            label: 'Miembros',
            icon: <IconUsers />,
            content: (
              <>
                <AddMemberByName groupId={id} />
                {isOwner && <DeleteTournament groupId={id} groupName={group.name} />}
              </>
            ),
          },
        ]}
      />
    </main>
  )
}
