import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function PendingApprovalPage() {
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

  if (profile?.is_approved) {
    redirect('/dashboard')
  }

  return (
    <main className="animate-fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '2rem' }}>
      <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', maxWidth: '500px' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--color-primary)' }}>Cuenta en Revisión</h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem', lineHeight: '1.6' }}>
          Hola <strong>{profile?.display_name || user.email}</strong>. Tu solicitud de registración ha sido enviada con éxito.
        </p>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem', lineHeight: '1.6' }}>
          Cuando seas confirmado por el administrador, podrás acceder al sistema. Se te avisará enviándote un mensaje al correo que ingresaste.
        </p>
        <form action="/auth/signout" method="post" style={{ marginTop: '2rem' }}>
          <button className="btn-primary" style={{ background: 'transparent', border: '1px solid var(--color-primary)' }}>
            Cerrar Sesión
          </button>
        </form>
      </div>
    </main>
  )
}
