import { login, signup } from './actions'
import styles from './page.module.css'
import Link from 'next/link'
import { LogoMark } from '@/components/Logo/Logo'

export default async function LoginPage(props: {
  searchParams: Promise<{ mode?: string; error?: string; message?: string }>
}) {
  const searchParams = await props.searchParams
  const isRegister = searchParams.mode === 'register'
  const hasError = searchParams.error === 'true'
  const errorMessage = searchParams.message

  return (
    <main className={styles.container}>
      <div className={styles.glassCard}>
        <LogoMark size={64} style={{ color: 'var(--color-accent)', display: 'block', margin: '0 auto 1rem', filter: 'drop-shadow(0 0 16px var(--color-primary-glow))' }} />
        <h1 className={styles.title}>Prode Argentino</h1>
        <p className={styles.subtitle}>
          {isRegister ? 'Crea tu cuenta para jugar' : 'Ingresa a tu cuenta'}
        </p>
        
        {hasError && (
          <div className={styles.errorBox}>
            {errorMessage || 'Ocurrió un error. Por favor intenta nuevamente.'}
          </div>
        )}
        
        <form className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" placeholder="tu@email.com" required />
          </div>
          <div className={styles.inputGroup}>
            <label htmlFor="password">Contraseña</label>
            <input id="password" name="password" type="password" placeholder="••••••••" required />
          </div>
          
          <div className={styles.actions}>
            {isRegister ? (
              <button formAction={signup} className={styles.btnLogin}>
                Registrarse
              </button>
            ) : (
              <button formAction={login} className={styles.btnLogin}>
                Iniciar Sesión
              </button>
            )}
          </div>
        </form>

        <div className={styles.toggleMode}>
          {isRegister ? (
            <p>¿Ya tienes cuenta? <Link href="/login?mode=login">Inicia Sesión</Link></p>
          ) : (
            <p>¿No tienes cuenta? <Link href="/login?mode=register">Regístrate</Link></p>
          )}
        </div>
      </div>
    </main>
  )
}
