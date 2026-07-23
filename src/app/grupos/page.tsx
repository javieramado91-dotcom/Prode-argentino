import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createGroupAction, joinGroupAction } from './actions'

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

  const { data } = await supabase.rpc('my_groups')
  const groups: Group[] = data || []

  // Fechas del torneo argentino, para elegir desde cuál arranca el torneo.
  const { data: matchRows } = await supabase
    .from('matches')
    .select('round, match_date, status')
    .order('match_date', { ascending: true })

  const allRounds = Array.from(new Set((matchRows || []).map((m: any) => m.round as string))).sort()
  const fechaNumber = new Map(allRounds.map((r, i) => [r, i + 1]))
  // Se puede arrancar desde cualquier fecha que todavía tenga partidos por jugar.
  const startOptions = allRounds
    .filter((r) => (matchRows || []).some((m: any) => m.round === r && m.status === 'pending' && new Date(m.match_date).getTime() > Date.now()))
    .map((r) => {
      const first = (matchRows || []).find((m: any) => m.round === r)
      const label = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' }).format(new Date(first!.match_date))
      return { value: r, label: `Fecha ${fechaNumber.get(r)} (desde el ${label})` }
    })

  return (
    <main className="animate-fade-in" style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 className="gradient-text" style={{ fontSize: 'clamp(1.6rem, 7vw, 2.25rem)', margin: 0 }}>Torneos entre amigos</h1>
        <Link href="/dashboard" className="btn-ghost">← Volver</Link>
      </header>

      {error && (
        <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem', borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}>
          {error}
        </div>
      )}

      {/* Crear / Unirse */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
        <form action={createGroupAction} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <h3 style={{ margin: 0, color: 'var(--color-primary)' }}>Crear un torneo</h3>
          <input name="name" placeholder="Nombre del torneo (ej: Los del asado)" required
            style={{ padding: '0.75rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.25)', color: 'var(--color-text-main)' }} />
          <label style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            ¿Desde qué fecha del campeonato puntúa?
          </label>
          <select name="start_round" defaultValue={startOptions[0]?.value ?? ''}
            style={{ padding: '0.75rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.25)', color: 'var(--color-text-main)', fontFamily: 'inherit' }}>
            {startOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
            <option value="">Desde el inicio del campeonato (cuenta todo)</option>
          </select>
          <button type="submit" className="btn-primary">Crear</button>
        </form>

        <form action={joinGroupAction} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <h3 style={{ margin: 0, color: 'var(--color-accent)' }}>Unirse con código</h3>
          <input name="code" placeholder="Código de invitación (ej: A1B2C3)" required
            style={{ padding: '0.75rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.25)', color: 'var(--color-text-main)', textTransform: 'uppercase' }} />
          <button type="submit" className="btn-primary" style={{ background: 'var(--color-accent)' }}>Unirme</button>
        </form>
      </section>

      {/* Mis grupos */}
      <h2 style={{ fontSize: '1.4rem', marginBottom: '1rem' }}>Mis torneos</h2>
      {groups.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)' }}>Todavía no estás en ningún torneo. Creá uno o unite con un código.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
          {groups.map((g) => (
            <Link key={g.id} href={`/grupos/${g.id}`} className="glass-panel" style={{ padding: '1.5rem', textDecoration: 'none', display: 'block' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>{g.name}</div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                👥 {g.members} {g.members === 1 ? 'miembro' : 'miembros'}
              </div>
              <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                Código: <strong style={{ color: 'var(--color-accent)', letterSpacing: 1 }}>{g.invite_code}</strong>
                {g.start_round && fechaNumber.has(g.start_round) && (
                  <> · Puntúa desde la Fecha {fechaNumber.get(g.start_round)}</>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
