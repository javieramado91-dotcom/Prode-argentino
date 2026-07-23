import Link from 'next/link';
import styles from './page.module.css';

export default function Home() {
  return (
    <main className="animate-fade-in" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4rem' }}>
        <h1 className="gradient-text" style={{ fontSize: '2.5rem' }}>Prode Liga Profesional</h1>
        <nav>
          <Link href="/login" className="btn-primary" style={{ display: 'inline-block', textDecoration: 'none' }}>Iniciar Sesión</Link>
        </nav>
      </header>

      <section style={{ textAlign: 'center', margin: '4rem 0' }}>
        <h2 style={{ fontSize: '3.5rem', marginBottom: '1.5rem' }}>Demuestra que sabes de fútbol.</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '1.25rem', maxWidth: '600px', margin: '0 auto 2.5rem' }}>
          Pronostica los resultados del fútbol argentino, compite con tus amigos y sube en el ranking global en tiempo real.
        </p>
        <Link href="/login" className="btn-primary" style={{ padding: '16px 32px', fontSize: '1.125rem', display: 'inline-block', textDecoration: 'none' }}>
          Empezar a Jugar
        </Link>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--color-primary)' }}>Predicciones en Vivo</h3>
          <p style={{ color: 'var(--color-text-muted)' }}>Los resultados se actualizan automáticamente al instante de cada gol.</p>
        </div>
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--color-accent)' }}>Torneos Privados</h3>
          <p style={{ color: 'var(--color-text-muted)' }}>Crea grupos cerrados para competir exclusivamente con tus amigos.</p>
        </div>
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--color-success)' }}>Mismas Reglas</h3>
          <p style={{ color: 'var(--color-text-muted)' }}>6 puntos por resultado exacto, 3 puntos por acertar ganador o empate.</p>
        </div>
      </section>
    </main>
  );
}
