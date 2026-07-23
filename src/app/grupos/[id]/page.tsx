import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import Leaderboard from '@/components/Leaderboard/Leaderboard'

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

  // Número de la fecha de arranque (posición cronológica entre todas las fechas).
  let startFechaNum: number | null = null
  if (group.start_round) {
    const { data: roundRows } = await supabase.from('matches').select('round')
    const rounds = Array.from(new Set((roundRows || []).map((r: any) => r.round as string))).sort()
    const idx = rounds.indexOf(group.start_round)
    if (idx >= 0) startFechaNum = idx + 1
  }

  const { data } = await supabase.rpc('get_group_leaderboard', { gid: id })
  const rows: Row[] = data || []
  const users = rows.map((r) => ({ id: r.user_id, name: r.display_name, points: r.points }))

  const inviteText = encodeURIComponent(
    `⚽ ¡Sumate a mi torneo "${group.name}" en el Prode Argentino!\n\n1. Entrá a https://prode-argentino.vercel.app\n2. Registrate y andá a "Grupos"\n3. Unite con el código: ${group.invite_code}`
  )

  return (
    <main className="animate-fade-in" style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
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
          <Link href="/grupos" className="btn-primary" style={{ background: 'var(--color-secondary)', textDecoration: 'none' }}>← Mis torneos</Link>
        </div>
      </header>

      <Leaderboard title="Ranking del torneo" users={users} />
    </main>
  )
}
