import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

import AutoSync from '@/components/AutoSync/AutoSync'
import { approveUser, deleteUser, toggleFeatured } from './actions'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) redirect('/dashboard')

  const { data: usersList } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })

  const pending = (usersList || []).filter((u: any) => !u.is_approved && !u.is_admin)
  const approved = (usersList || []).filter((u: any) => u.is_approved || u.is_admin)

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
    <main className="animate-fade-in" style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 className="gradient-text" style={{ fontSize: 'clamp(1.5rem, 6vw, 2rem)', margin: 0 }}>Panel de Administrador</h1>
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <Link href="/dashboard" className="btn-ghost">🏠 Inicio</Link>
          <form action="/auth/signout" method="post">
            <button className="btn-ghost" style={{ color: 'var(--color-danger)', borderColor: 'rgba(248,113,113,0.3)' }}>Salir</button>
          </form>
        </div>
      </header>

      {/* Sincronización automática (si falla, avisa) */}
      <AutoSync />

      {/* ================= Solicitudes de registro ================= */}
      <section className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem', borderColor: pending.length > 0 ? 'rgba(248,113,113,0.4)' : undefined }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          📥 Solicitudes de registro
          {pending.length > 0 && (
            <span style={{ background: 'var(--color-danger)', color: '#fff', borderRadius: 999, fontSize: '0.8rem', fontWeight: 800, padding: '2px 10px', minWidth: 26, textAlign: 'center' }}>
              {pending.length}
            </span>
          )}
        </h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem', marginBottom: '1.1rem' }}>
          Nuevos usuarios esperando tu aprobación para poder jugar.
        </p>

        {pending.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '1.5rem 0' }}>
            ✅ No hay solicitudes pendientes.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
            {pending.map((u: any) => (
              <div key={u.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap',
                padding: '0.85rem 1rem', borderRadius: 12, background: 'var(--color-bg-inset)',
                border: '1px solid rgba(248,113,113,0.25)',
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#00122e',
                }}>
                  {(u.display_name || u.email).substring(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{u.display_name || '—'}</div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <form action={approveUser}>
                    <input type="hidden" name="userId" value={u.id} />
                    <button type="submit" className="btn-primary" style={{ background: 'var(--color-success)' }}>✓ Aprobar</button>
                  </form>
                  <form action={deleteUser}>
                    <input type="hidden" name="userId" value={u.id} />
                    <button type="submit" className="btn-ghost" style={{ color: 'var(--color-danger)', borderColor: 'rgba(248,113,113,0.3)' }}>Eliminar</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ================= Partido de la Fecha ================= */}
      {matchesList && matchesList.length > 0 && (
        <section className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.35rem' }}>⭐ Partido de la Fecha (vale doble)</h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.1rem', fontSize: '0.88rem' }}>
            Elegí el partido destacado de la <strong>próxima fecha</strong>: sus puntos valen x2. Solo puede haber uno.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '0.6rem' }}>
            {matchesList.map((m: any) => (
              <form key={m.id} action={toggleFeatured} style={{ margin: 0 }}>
                <input type="hidden" name="matchId" value={m.id} />
                <button type="submit" style={{
                  width: '100%', textAlign: 'left', cursor: 'pointer',
                  padding: '0.7rem 0.9rem', borderRadius: 10, fontFamily: 'inherit', fontSize: '0.88rem',
                  border: m.featured ? '1px solid var(--color-warning)' : '1px solid rgba(148,163,184,0.14)',
                  background: m.featured ? 'rgba(251,191,36,0.12)' : 'var(--color-bg-inset)',
                  color: 'var(--color-text-main)',
                }}>
                  <span style={{ marginRight: '0.5rem' }}>{m.featured ? '⭐' : '☆'}</span>
                  {m.home_team} vs {m.away_team}
                </button>
              </form>
            ))}
          </div>
        </section>
      )}

      {/* ================= Todos los usuarios ================= */}
      <section className="glass-panel" style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.1rem' }}>👥 Usuarios ({approved.length})</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', minWidth: 460 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(148,163,184,0.15)' }}>
                <th style={{ padding: '0.7rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Email</th>
                <th style={{ padding: '0.7rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Nombre</th>
                <th style={{ padding: '0.7rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Estado</th>
                <th style={{ padding: '0.7rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {approved.map((u: any) => (
                <tr key={u.id} style={{ borderBottom: '1px solid rgba(148,163,184,0.07)' }}>
                  <td style={{ padding: '0.7rem' }}>{u.email}</td>
                  <td style={{ padding: '0.7rem' }}>{u.display_name || '-'}</td>
                  <td style={{ padding: '0.7rem' }}>
                    {u.is_admin
                      ? <span style={{ color: 'var(--color-accent)' }}>Admin</span>
                      : <span style={{ color: 'var(--color-success)' }}>Aprobado</span>}
                  </td>
                  <td style={{ padding: '0.7rem' }}>
                    {!u.is_admin && (
                      <form action={deleteUser}>
                        <input type="hidden" name="userId" value={u.id} />
                        <button type="submit" style={{
                          padding: '5px 12px', background: 'transparent', color: 'var(--color-danger)',
                          border: '1px solid rgba(248,113,113,0.3)', borderRadius: 7, cursor: 'pointer',
                          fontFamily: 'inherit', fontSize: '0.82rem',
                        }}>Eliminar</button>
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
