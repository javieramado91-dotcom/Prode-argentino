import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

import AutoSync from '@/components/AutoSync/AutoSync'
import { approveUser, toggleFeatured } from './actions'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    redirect('/dashboard') // O pending-approval si no está aprobado
  }

  // Obtener lista de usuarios para que Javier los apruebe
  const { data: usersList } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })

  // Solo los partidos de la PRÓXIMA fecha (para elegir el "Partido de la Fecha").
  const { data: allMatches } = await supabase
    .from('matches')
    .select('id, home_team, away_team, match_date, featured, status, round')
    .order('match_date', { ascending: true })

  const nextRound = allMatches?.find(
    (m: any) => m.status === 'pending' && new Date(m.match_date).getTime() > Date.now()
  )?.round
  const matchesList = nextRound
    ? allMatches?.filter((m: any) => m.round === nextRound)
    : allMatches?.slice(0, 15)

  return (
    <main className="animate-fade-in" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ fontSize: '2rem', color: 'var(--color-primary)' }}>Panel de Administrador</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link href="/dashboard" className="btn-ghost">🏠 Inicio</Link>
          <form action="/auth/signout" method="post">
             <button className="btn-ghost" style={{ color: 'var(--color-danger)', borderColor: 'rgba(248,113,113,0.3)' }}>Salir</button>
          </form>
        </div>
      </header>

      {/* La sincronización es automática al entrar; si falla, muestra el aviso. */}
      <AutoSync />
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
        🔄 Los partidos se sincronizan solos con ESPN cada vez que alguien entra o actualiza la página.
      </p>

      {matchesList && matchesList.length > 0 && (
        <section className="glass-panel" style={{ padding: '2rem', marginTop: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Partido de la Fecha (vale doble)</h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            Elegí el partido destacado de la <strong>próxima fecha</strong>: sus puntos valen x2. Solo puede haber uno por fecha.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
            {matchesList.map((m: any) => (
              <form key={m.id} action={toggleFeatured} style={{ margin: 0 }}>
                <input type="hidden" name="matchId" value={m.id} />
                <button
                  type="submit"
                  style={{
                    width: '100%', textAlign: 'left', cursor: 'pointer',
                    padding: '0.75rem 1rem', borderRadius: '8px',
                    border: m.featured ? '1px solid var(--color-warning)' : '1px solid rgba(255,255,255,0.1)',
                    background: m.featured ? 'rgba(245,158,11,0.12)' : 'rgba(0,0,0,0.2)',
                    color: 'var(--color-text-main)',
                  }}
                >
                  <span style={{ marginRight: '0.5rem' }}>{m.featured ? '⭐' : '☆'}</span>
                  {m.home_team} vs {m.away_team}
                </button>
              </form>
            ))}
          </div>
        </section>
      )}

      <section className="glass-panel" style={{ padding: '2rem', marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Usuarios Registrados</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>Email</th>
                <th style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>Nombre</th>
                <th style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>Estado</th>
                <th style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usersList?.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '1rem' }}>{u.email}</td>
                  <td style={{ padding: '1rem' }}>{u.display_name || '-'}</td>
                  <td style={{ padding: '1rem' }}>
                    {u.is_admin ? (
                      <span style={{ color: 'var(--color-accent)' }}>Admin</span>
                    ) : u.is_approved ? (
                      <span style={{ color: 'var(--color-success)' }}>Aprobado</span>
                    ) : (
                      <span style={{ color: 'orange' }}>Pendiente</span>
                    )}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {!u.is_approved && (
                      <form action={approveUser}>
                        <input type="hidden" name="userId" value={u.id} />
                        <button type="submit" style={{ padding: '4px 12px', background: 'var(--color-success)', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer' }}>
                          Aprobar
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
