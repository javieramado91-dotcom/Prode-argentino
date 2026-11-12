import Link from 'next/link';
import styles from './page.module.css';
import Logo, { LogoMark } from '@/components/Logo/Logo';
import { IconBracket, IconTarget, IconUsers, IconWhistle } from '@/components/Icons/Icons';

export default function Home() {
  return (
    <main className="animate-fade-in" style={{ padding: '0 2rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header className={styles.topbar}>
        <Logo size={44} />
        <Link href="/login" className="btn-ghost">Iniciar sesión</Link>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroText}>
          <span className="tag tag-gold"><IconBracket /> Playoffs · Clausura 2026</span>
          <h1 className={styles.heroTitle}>
            Demostrá que <span className={styles.heroAccent}>sabés de fútbol</span>
          </h1>
          <p className={styles.heroLead}>
            Pronosticá los partidos de la Liga Profesional, sumá puntos en vivo y competí con tus amigos.
            Arrancan los playoffs: desde octavos hasta la final, el que más suma se lleva todo.
          </p>
          {/* Primero el acceso de los que ya juegan; crear cuenta es el paso aparte. */}
          <div className={styles.heroCtas}>
            <Link href="/login" className="btn-primary" style={{ minHeight: 52, padding: '0 28px', fontSize: '1.15rem' }}>
              Iniciar sesión
            </Link>
            <Link href="/login?mode=register" className="btn-ghost" style={{ minHeight: 52, padding: '0 22px', fontSize: '1.05rem' }}>
              Crear cuenta
            </Link>
          </div>
        </div>
        <div className={styles.heroArt} aria-hidden="true">
          <div className={styles.heroRing} />
          <LogoMark size={220} className={styles.heroMark} />
        </div>
      </section>

      <section className={styles.features}>
        <div className={`glass-panel ${styles.feature}`}>
          <span className={styles.featureIcon}><IconTarget size={22} /></span>
          <h3>6 · 3 · 0</h3>
          <p>6 puntos el resultado exacto, 3 si acertás ganador o empate. El partido destacado vale doble.</p>
        </div>
        <div className={`glass-panel ${styles.feature}`}>
          <span className={styles.featureIcon}><IconWhistle size={22} /></span>
          <h3>En vivo</h3>
          <p>Los resultados se actualizan solos con cada gol y te avisamos cuando empieza y termina tu partido.</p>
        </div>
        <div className={`glass-panel ${styles.feature}`}>
          <span className={styles.featureIcon}><IconUsers size={22} /></span>
          <h3>Torneos privados</h3>
          <p>Armá tu torneo con amigos: tabla de playoffs, tabla general, ganadores por fecha y placas para compartir.</p>
        </div>
      </section>
    </main>
  );
}
