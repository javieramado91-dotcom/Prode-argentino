import styles from './page.module.css'
import { LogoMark } from '@/components/Logo/Logo'
import LoginForm from './LoginForm'

export default async function LoginPage(props: {
  searchParams: Promise<{ mode?: string; error?: string; message?: string; info?: string }>
}) {
  const searchParams = await props.searchParams
  const initialMode = searchParams.mode === 'register' ? 'register' : 'login'
  const hasError = searchParams.error === 'true'
  const infoMessage = searchParams.info
  let errorMessage = searchParams.message
  if (errorMessage === '[]' || errorMessage === '{}' || errorMessage === '[object Object]') {
    errorMessage = 'Ocurrió un error al intentar ingresar. Por favor verifica tus datos e intenta nuevamente.'
  }

  return (
    <main className={styles.container}>
      <div className={styles.glassCard}>
        <LogoMark size={60} style={{ color: 'var(--color-accent)', display: 'block', margin: '0 auto 0.9rem', filter: 'drop-shadow(0 0 16px var(--color-primary-glow))' }} />
        <h1 className={styles.title}>Prode Argentino</h1>

        {hasError && (
          <div className={styles.errorBox}>
            {errorMessage || 'Ocurrió un error. Por favor intenta nuevamente.'}
          </div>
        )}

        {infoMessage && !hasError && (
          <div className={styles.infoBox}>{infoMessage}</div>
        )}

        <LoginForm initialMode={initialMode} />
      </div>
    </main>
  )
}
