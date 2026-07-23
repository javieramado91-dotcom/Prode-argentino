import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

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
function level(points: number): { name: string; icon: string; color: string; next: number | null } {
  if (points >= 300) return { name: 'Leyenda', icon: '👑', color: '#facc15', next: null }
  if (points >= 150) return { name: 'Maestro del Prode', icon: '🥇', color: '#fbbf24', next: 300 }
  if (points >= 60) return { name: 'Experto', icon: '🥈', color: '#cbd5e1', next: 150 }
  return { name: 'Amateur', icon: '🥉', color: '#d97706', next: 60 }
}

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
      <div style={{ fontSize: '2.25rem', fontWeight: 800, color: accent || 'var(--color-text-main)' }}>{value}</div>
      <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>{label}</div>
    </div>
  )
}

export default async function PerfilPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single()
  if (!profile?.is_approved) redirect('/pending-approval')

  const { data: statsRows } = await supabase.rpc('get_user_stats', { uid: user.id })
  const s: Stats = statsRows?.[0] || {
    played: 0, exact_count: 0, correct_count: 0, zero_count: 0,
    total_points: 0, accuracy: 0, best_streak: 0, rank_position: 0,
  }

  const name = profile.display_name || user.email
  const lvl = level(s.total_points)
  const progress = lvl.next ? Math.min(100, Math.round((s.total_points / lvl.next) * 100)) : 100

  return (
    <main className="animate-fade-in" style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 className="gradient-text" style={{ fontSize: 'clamp(1.6rem, 7vw, 2.25rem)', margin: 0 }}>Mi Perfil</h1>
        <Link href="/dashboard" className="btn-ghost">← Volver</Link>
      </header>

      {/* Tarjeta de identidad + nivel */}
      <section className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.75rem', fontWeight: 800, color: '#00122e',
        }}>
          {String(name).substring(0, 2).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 240 }}>
          <h2 style={{ margin: '0 0 0.25rem 0', fontSize: '1.5rem' }}>{name}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '1.4rem' }}>{lvl.icon}</span>
            <span style={{ fontWeight: 700, color: lvl.color }}>{lvl.name}</span>
            {s.rank_position > 0 && (
              <span style={{ marginLeft: 'auto', color: 'var(--color-text-muted)' }}>
                Puesto <strong style={{ color: 'var(--color-accent)' }}>#{s.rank_position}</strong>
              </span>
            )}
          </div>
          {/* Barra de progreso al siguiente nivel */}
          <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 999, height: 10, overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, var(--color-primary), var(--color-accent))' }} />
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.4rem' }}>
            {lvl.next ? `${s.total_points} / ${lvl.next} pts para el próximo nivel` : '¡Nivel máximo alcanzado!'}
          </div>
        </div>
      </section>

      {/* Estadísticas */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
        <StatCard label="Puntos totales" value={s.total_points} accent="var(--color-accent)" />
        <StatCard label="% de aciertos" value={`${s.accuracy}%`} accent="var(--color-primary)" />
        <StatCard label="Partidos jugados" value={s.played} />
        <StatCard label="Resultados exactos" value={s.exact_count} accent="var(--color-success)" />
        <StatCard label="Ganador acertado" value={s.correct_count} />
        <StatCard label="Mejor racha" value={`${s.best_streak} 🔥`} accent="var(--color-warning)" />
      </section>

      {s.played === 0 && (
        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginTop: '2rem' }}>
          Todavía no tenés partidos finalizados con pronóstico. ¡Cargá tus predicciones en la fecha actual!
        </p>
      )}
    </main>
  )
}
