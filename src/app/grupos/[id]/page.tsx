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
    .select('name, invite_code')
    .eq('id', id)
    .single()

  // Si no es miembro, la RLS oculta el grupo → 404.
  if (!group) notFound()

  const { data } = await supabase.rpc('get_group_leaderboard', { gid: id })
  const rows: Row[] = data || []
  const users = rows.map((r) => ({ id: r.user_id, name: r.display_name, points: r.points }))

  return (
    <main className="animate-fade-in" style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="gradient-text" style={{ fontSize: '2rem', margin: '0 0 0.25rem 0' }}>{group.name}</h1>
          <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
            Código para invitar: <strong style={{ color: 'var(--color-accent)', letterSpacing: 1 }}>{group.invite_code}</strong>
          </p>
        </div>
        <Link href="/grupos" className="btn-primary" style={{ background: 'var(--color-secondary)', textDecoration: 'none' }}>← Mis grupos</Link>
      </header>

      <Leaderboard title="Ranking del grupo" users={users} />
    </main>
  )
}
