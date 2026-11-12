import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import TopNav from '@/components/TopNav/TopNav'
import NotificationToggle from '@/components/NotificationToggle/NotificationToggle'
import { IconArchive, IconBracket, IconChart, IconFire, IconMedal, IconStar, IconTarget, IconTrophy } from '@/components/Icons/Icons'
import { VAPID_PUBLIC_KEY } from '@/lib/push/keys'
import { buildScopeData, meIn } from '@/lib/phaseData'
import type { RoundScore } from '@/lib/awards'
import type { MatchRow, PredictionRow } from '@/lib/db-types'
import { getSettings } from './notify-actions'

export const dynamic = 'force-dynamic'

type Stats = {
  played: number
  exact_count: number
  correct_count: number
  zero_count: number
  total_points: number
  accuracy: number
  best_streak: number
  rank_position: number
}

// Nivel estilo videojuego según puntos acumulados.
function level(points: number): { name: string; color: string; next: number | null; prev: number } {
  if (points >= 300) return { name: 'Leyenda', color: '#facc15', next: null, prev: 300 }
  if (points >= 150) return { name: 'Maestro del Prode', color: '#fbbf24', next: 300, prev: 150 }
  if (points >= 60) return { name: 'Experto', color: '#cbd5e1', next: 150, prev: 60 }
  return { name: 'Amateur', color: '#d9905a', next: 60, prev: 0 }
}

function StatCard({ label, value, accent, icon, hint }: { label: string; value: string | number; accent?: string; icon?: ReactNode; hint?: string }) {
  return (
    <div className="glass-panel" style={{ padding: '1.1rem 1.15rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
      {icon && <span style={{ color: accent || 'var(--color-accent)', display: 'inline-flex', marginBottom: 4 }}>{icon}</span>}
      <span className="num" style={{ fontSize: '2.2rem', lineHeight: 1, color: accent || 'var(--color-text-main)' }}>{value}</span>
      <span className="display" style={{ fontSize: '0.85rem', letterSpacing: '0.1em', color: 'var(--color-text-muted)' }}>{label}</span>
      {hint && <span style={{ fontSize: '0.76rem', color: 'var(--color-text-dim)' }}>{hint}</span>}
    </div>
  )
}

type PhaseStat = { played: number; exacts: number; correct: number; points: number }

export default async function PerfilPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single()
  if (!profile?.is_approved) redirect('/pending-approval')

  const [{ data: statsRows }, { data: matches }, { data: preds }, { data: leaderboard }, { data: roundScores }, notifySettings] =
    await Promise.all([
      supabase.rpc('get_user_stats', { uid: user.id }),
      supabase.from('matches').select('id, round, status, match_date, home_score, away_score'),
      supabase.from('predictions').select('match_id, predicted_home_score, predicted_away_score, points_earned').eq('user_id', user.id),
      supabase.rpc('get_leaderboard'),
      supabase.rpc('get_round_scores'),
      getSettings(),
    ])

  const s: Stats = statsRows?.[0] || {
    played: 0, exact_count: 0, correct_count: 0, zero_count: 0,
    total_points: 0, accuracy: 0, best_streak: 0, rank_position: 0,
  }

  type Fila = { user_id: string; display_name: string }
  const partidos: Pick<MatchRow, 'id' | 'round' | 'status' | 'match_date' | 'home_score' | 'away_score'>[] = matches || []
  const misPronosticos: Pick<PredictionRow, 'match_id' | 'predicted_home_score' | 'predicted_away_score' | 'points_earned'>[] = preds || []
  const members = ((leaderboard || []) as Fila[]).map((r) => ({ id: r.user_id, name: r.display_name }))
  const scope = buildScopeData({ matches: partidos, scores: (roundScores || []) as RoundScore[], members, context: 'Ranking general' })

  // Estadísticas por fase a partir de mis pronósticos.
  const matchById = new Map(partidos.map((m) => [m.id, m]))
  const statFor = (rounds: Set<string>): PhaseStat => {
    const out: PhaseStat = { played: 0, exacts: 0, correct: 0, points: 0 }
    for (const p of misPronosticos) {
      const m = matchById.get(p.match_id)
      if (!m || !m.round || !rounds.has(m.round) || m.status !== 'finished' || p.predicted_home_score == null) continue
      if (m.home_score == null || m.away_score == null) continue
      out.played++
      out.points += p.points_earned ?? 0
      const exact = m.home_score === p.predicted_home_score && m.away_score === p.predicted_away_score
      const outcome = Math.sign(m.home_score - m.away_score) === Math.sign(p.predicted_home_score - p.predicted_away_score)
      if (exact) out.exacts++
      else if (outcome) out.correct++
    }
    return out
  }
  const pct = (st: PhaseStat) => (st.played > 0 ? Math.round((100 * (st.exacts + st.correct)) / st.played) : 0)

  const playoffStat = scope.playoffs ? statFor(new Set(scope.playoffs.rounds)) : null
  const regularStat = scope.regular ? statFor(new Set(scope.regular.rounds)) : null
  const mePlayoffs = meIn(scope.playoffRows, user.id)
  const archiveIdx = scope.archive ? scope.archive.standings.findIndex((r) => r.userId === user.id) : -1
  const meRegular = scope.archive && archiveIdx >= 0 ? meIn(scope.archive.standings, user.id) : null
  const fechasGanadas = scope.archive
    ? scope.archive.fechaWinners.filter((f) => f.winnerIds.includes(user.id)).length
    : 0

  const name = profile.display_name || user.email
  const lvl = level(s.total_points)
  const progress = lvl.next ? Math.min(100, Math.round(((s.total_points - lvl.prev) / (lvl.next - lvl.prev)) * 100)) : 100

  return (
    <main className="animate-fade-in" style={{ padding: '0 2rem 2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <TopNav active="perfil" />

      {/* Tarjeta de identidad + nivel */}
      <section
        className="glass-panel"
        style={{
          padding: '1.6rem',
          marginBottom: '1.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1.4rem',
          flexWrap: 'wrap',
          background: 'radial-gradient(420px 200px at 0% 0%, rgba(0,158,227,0.22), transparent 70%), var(--color-bg-panel)',
        }}
      >
        <div style={{
          width: 88, height: 88, borderRadius: 26, flexShrink: 0,
          background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)', fontSize: '2.4rem', fontWeight: 900, color: '#00122e',
          boxShadow: '0 12px 30px -12px var(--color-primary-glow)',
        }}>
          {String(name).substring(0, 2).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 230 }}>
          <div className="eyebrow">Mi perfil</div>
          <h1 className="page-title" style={{ fontSize: 'clamp(1.9rem, 7vw, 2.6rem)', margin: '2px 0 0.5rem', overflowWrap: 'anywhere' }}>{name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
            <span className="tag" style={{ color: lvl.color, background: 'rgba(148,163,184,0.1)' }}><IconStar /> {lvl.name}</span>
            {s.rank_position > 0 && <span className="tag tag-celeste">General #{s.rank_position}</span>}
            {mePlayoffs && scope.playoffs?.started && <span className="tag tag-gold">Playoffs #{mePlayoffs.position}</span>}
          </div>
          <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 999, height: 8, overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, var(--color-primary), var(--color-accent))' }} />
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.35rem' }}>
            {lvl.next ? `${s.total_points} / ${lvl.next} pts para el próximo nivel` : '¡Nivel máximo alcanzado!'}
          </div>
        </div>
      </section>

      {/* Playoffs */}
      {playoffStat && mePlayoffs && (
        <>
          <h2 className="section-title"><span className="icon" style={{ display: 'inline-flex' }}><IconBracket size={22} /></span>Playoffs</h2>
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.85rem', marginBottom: '2rem' }}>
            <StatCard label="Puntos playoffs" value={mePlayoffs.points} accent="var(--color-gold)" icon={<IconTrophy />} />
            <StatCard label="Puesto" value={scope.playoffs?.started ? `${mePlayoffs.position}º` : '—'} hint={`de ${mePlayoffs.total}`} icon={<IconMedal />} />
            <StatCard label="Exactos" value={playoffStat.exacts} accent="var(--color-success)" icon={<IconTarget />} />
            <StatCard label="% aciertos" value={`${pct(playoffStat)}%`} icon={<IconChart />} hint={`${playoffStat.played} partidos`} />
          </section>
        </>
      )}

      {/* Fase de Grupos (cerrada) */}
      {regularStat && scope.archive && (
        <>
          <h2 className="section-title"><span className="icon" style={{ display: 'inline-flex' }}><IconArchive size={22} /></span>Fase de Grupos <span className="tag tag-gold" style={{ marginLeft: 4 }}>Cerrada</span></h2>
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.85rem', marginBottom: '2rem' }}>
            <StatCard label="Puesto final" value={meRegular ? `${meRegular.position}º` : '—'} hint={meRegular ? `de ${meRegular.total}` : undefined} icon={<IconMedal />} accent="var(--color-gold)" />
            <StatCard label="Puntos" value={regularStat.points} icon={<IconTrophy />} />
            <StatCard label="Exactos" value={regularStat.exacts} accent="var(--color-success)" icon={<IconTarget />} />
            <StatCard label="Fechas ganadas" value={fechasGanadas} icon={<IconStar />} />
            <StatCard label="% aciertos" value={`${pct(regularStat)}%`} icon={<IconChart />} hint={`${regularStat.played} partidos`} />
          </section>
        </>
      )}

      {/* Historial total */}
      <h2 className="section-title"><span className="icon" style={{ display: 'inline-flex' }}><IconChart size={22} /></span>Historial total</h2>
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.85rem' }}>
        <StatCard label="Puntos totales" value={s.total_points} accent="var(--color-accent)" />
        <StatCard label="% de aciertos" value={`${s.accuracy}%`} accent="var(--color-primary)" />
        <StatCard label="Partidos jugados" value={s.played} />
        <StatCard label="Resultados exactos" value={s.exact_count} accent="var(--color-success)" />
        <StatCard label="Ganador acertado" value={s.correct_count} />
        <StatCard label="Mejor racha" value={s.best_streak} accent="var(--color-warning)" icon={<IconFire />} />
      </section>

      {s.played === 0 && (
        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginTop: '2rem' }}>
          Todavía no tenés partidos finalizados con pronóstico. ¡Cargá tus predicciones en la fecha actual!
        </p>
      )}

      <NotificationToggle vapidPublicKey={VAPID_PUBLIC_KEY} initialSettings={notifySettings} />
    </main>
  )
}
