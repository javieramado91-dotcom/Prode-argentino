import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createGroupAction, joinGroupAction } from './actions'

export const dynamic = 'force-dynamic'

type Group = { id: string; name: string; invite_code: string; members: number; my_points: number }

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

  return (
    <main className="animate-fade-in" style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 className="gradient-text" style={{ fontSize: 'clamp(1.6rem, 7vw, 2.25rem)', margin: 0 }}>Grupos</h1>
        <Link href="/dashboard" className="btn-primary" style={{ background: 'var(--color-secondary)', textDecoration: 'none' }}>← Volver</Link>
      </header>

      {error && (
        <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem', borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}>
          {error}
        </div>
      )}

      {/* Crear / Unirse */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
        <form action={createGroupAction} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <h3 style={{ margin: 0, color: 'var(--color-primary)' }}>Crear un grupo</h3>
          <input name="name" placeholder="Nombre del grupo (ej: Los del asado)" required
            style={{ padding: '0.75rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.25)', color: 'var(--color-text-main)' }} />
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
      <h2 style={{ fontSize: '1.4rem', marginBottom: '1rem' }}>Mis grupos</h2>
      {groups.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)' }}>Todavía no estás en ningún grupo. Creá uno o unite con un código.</p>
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
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
