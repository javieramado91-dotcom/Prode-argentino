import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import TopNav from '@/components/TopNav/TopNav'
import { IconArrowRight, IconPlus, IconTrophy, IconUsers } from '@/components/Icons/Icons'
import { buildPhases, buildRoundInfo } from '@/lib/phases'
import { createGroupAction, joinGroupAction } from './actions'
import { diaMes } from '@/lib/fecha'

export const dynamic = 'force-dynamic'

type Group = { id: string; name: string; invite_code: string; members: number; my_points: number; start_round?: string | null }

export default async function GruposPage(props: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await props.searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('is_approved').eq('id', user.id).single()
  if (!profile?.is_approved) redirect('/pending-approval')

  const [{ data }, { data: matchRows }] = await Promise.all([
    supabase.rpc('my_groups'),
    // Fechas del torneo argentino, para elegir desde cuál arranca el torneo.
    supabase.from('matches').select('round, match_date, status').order('match_date', { ascending: true }),
  ])
  const groups: Group[] = data || []
  const rows = (matchRows || []) as { round: string; match_date: string; status: string }[]
  const info = buildRoundInfo(rows)
  const playoffs = buildPhases(rows).find((p) => p.def.kind === 'playoffs')

  const allRounds = [...info.keys()].sort()
  // Se puede arrancar desde cualquier fecha que todavía tenga partidos por jugar.
  const startOptions = allRounds
    .filter((r) => rows.some((m) => m.round === r && m.status === 'pending' && new Date(m.match_date).getTime() > Date.now()))
    .map((r) => {
      const first = rows.find((m) => m.round === r)
      const label = diaMes(first!.match_date)
      return { value: r, label: `${info.get(r)?.label ?? 'Fecha'} (desde el ${label})` }
    })

  return (
    <main className="animate-fade-in" style={{ padding: '0 2rem 2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <TopNav active="torneos" />
      <header style={{ marginBottom: '1.75rem' }}>
        <div className="eyebrow">Competí con tus amigos</div>
        <h1 className="page-title" style={{ marginTop: 4 }}>Torneos</h1>
        {playoffs && (
          <p className="muted" style={{ marginTop: '0.5rem', maxWidth: '62ch' }}>
            Todos los torneos siguen con los <strong style={{ color: '#fde68a' }}>Playoffs</strong>: tabla aparte desde octavos
            hasta la final, la tabla general sigue sumando y la Fase de Grupos queda guardada como recuerdo.
          </p>
        )}
      </header>

      {error && (
        <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem', borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}>
          {error}
        </div>
      )}

      {/* Mis torneos */}
      <h2 className="section-title">Mis torneos</h2>
      {groups.length === 0 ? (
        <div className="glass-panel empty-state" style={{ marginBottom: '2rem' }}>Todavía no estás en ningún torneo. Creá uno o unite con un código.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
          {groups.map((g) => (
            <Link key={g.id} href={`/grupos/${g.id}`} className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', position: 'relative', overflow: 'hidden' }}>
              <span aria-hidden="true" style={{ position: 'absolute', right: -18, top: -18, color: 'rgba(56,189,248,0.08)' }}>
                <IconTrophy size={110} />
              </span>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                <span className="display" style={{ fontSize: '1.65rem', overflowWrap: 'anywhere' }}>{g.name}</span>
                <IconArrowRight size={20} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                <span className="tag"><IconUsers /> {g.members} {g.members === 1 ? 'jugador' : 'jugadores'}</span>
                <span className="tag tag-celeste">Código {g.invite_code}</span>
                {playoffs && <span className="tag tag-gold">Playoffs</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginTop: 'auto' }}>
                <span className="num" style={{ fontSize: '2rem', color: 'var(--color-accent)', lineHeight: 1 }}>{g.my_points}</span>
                <span className="muted" style={{ fontSize: '0.82rem' }}>
                  tus puntos totales{g.start_round && info.has(g.start_round) ? ` · desde la ${info.get(g.start_round)!.label}` : ''}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Crear / Unirse */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        <form action={createGroupAction} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <h3 style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconPlus size={20} style={{ color: 'var(--color-accent)' }} /> Crear un torneo
          </h3>
          <label className="label" htmlFor="g-name">Nombre</label>
          <input id="g-name" name="name" className="input" placeholder="Ej: Los del asado" required />
          <label className="label" htmlFor="g-start">¿Desde qué fecha puntúa?</label>
          <select id="g-start" name="start_round" className="input" defaultValue={startOptions[0]?.value ?? ''}>
            {startOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
            <option value="">Desde el inicio del campeonato (cuenta todo)</option>
          </select>
          <button type="submit" className="btn-primary">Crear torneo</button>
        </form>

        <form action={joinGroupAction} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <h3 style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconUsers size={20} style={{ color: 'var(--color-accent)' }} /> Unirse con código
          </h3>
          <label className="label" htmlFor="g-code">Código de invitación</label>
          <input id="g-code" name="code" className="input" placeholder="Ej: A1B2C3" required style={{ textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700 }} />
          <button type="submit" className="btn-ghost">Unirme</button>
        </form>
      </section>
    </main>
  )
}
