import { forwardRef, type CSSProperties } from 'react'
import type { FechaWinner, Award } from '@/lib/awards'

// Placa 9:16 (1080×1920) para stories de Instagram. Presentacional: recibe los
// datos ya calculados. AwardsShare la monta fuera de pantalla y la captura.
const C = {
  primary: '#009ee3',
  accent: '#38bdf8',
  text: '#f1f5f9',
  muted: '#8b9bb4',
  gold: '#fbbf24',
}

type Props = {
  title: string
  fechaWinners: FechaWinner[]
  awards: Award[]
  style?: CSSProperties
}

const AwardsStoryCard = forwardRef<HTMLDivElement, Props>(function AwardsStoryCard(
  { title, fechaWinners, awards, style },
  ref
) {
  const hero = fechaWinners[0]
  const recent = fechaWinners.slice(0, 4)

  return (
    <div
      ref={ref}
      style={{
        width: 1080,
        height: 1920,
        padding: '76px 80px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        background: `radial-gradient(1200px 900px at 50% -10%, rgba(0,158,227,0.22), transparent 60%), linear-gradient(165deg, #0b1220 0%, #0f1e33 55%, #0a1120 100%)`,
        color: C.text,
        fontFamily: 'Outfit, system-ui, sans-serif',
        ...style,
      }}
    >
      {/* Marca */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 44 }}>⚽</span>
          <span style={{ fontSize: 30, fontWeight: 800, letterSpacing: 3 }}>PRODE ARGENTINO</span>
        </div>
        <span style={{ fontSize: 24, fontWeight: 700, color: C.muted, letterSpacing: 2 }}>CLAUSURA 2026</span>
      </div>

      {/* Título */}
      <div>
        <div
          style={{
            fontSize: 100,
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: -2,
            background: `linear-gradient(90deg, ${C.primary}, ${C.accent})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          PREMIOS
        </div>
        <div style={{ fontSize: 34, color: C.muted, fontWeight: 600, marginTop: 8 }}>{title}</div>
      </div>

      {/* Héroe: ganador de la última fecha */}
      {hero && (
        <div
          style={{
            marginTop: 28,
            borderRadius: 40,
            padding: '44px 52px',
            background: `linear-gradient(135deg, rgba(0,158,227,0.20), rgba(56,189,248,0.05))`,
            border: `2px solid rgba(56,189,248,0.22)`,
            display: 'flex',
            alignItems: 'center',
            gap: 40,
          }}
        >
          <div style={{ fontSize: 150, lineHeight: 1 }}>🏆</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: 4, color: C.accent }}>
              GANADOR · {hero.fecha ? `FECHA ${hero.fecha}` : 'FECHA'}
            </div>
            <div style={{ fontSize: 78, fontWeight: 900, lineHeight: 1.05, marginTop: 8 }}>
              {hero.winners.join(' · ')}
            </div>
            <div style={{ fontSize: 40, fontWeight: 800, color: C.gold, marginTop: 12 }}>{hero.points} puntos</div>
          </div>
        </div>
      )}

      {/* Premios de la temporada */}
      <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: 3, color: C.muted, margin: '44px 0 18px' }}>
        🏅 PREMIOS DE LA TEMPORADA
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {awards.map((a) => (
          <div
            key={a.key}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 32,
              padding: '30px 40px',
              borderRadius: 28,
              background: 'rgba(255,255,255,0.04)',
              border: '2px solid rgba(255,255,255,0.06)',
            }}
          >
            <span style={{ fontSize: 72, lineHeight: 1 }}>{a.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: C.muted, letterSpacing: 1 }}>{a.title}</div>
              <div style={{ fontSize: 52, fontWeight: 900, lineHeight: 1.1, marginTop: 2 }}>{a.winnerName ?? '—'}</div>
              <div style={{ fontSize: 28, color: C.accent, fontWeight: 600 }}>{a.detail}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Ganadores por fecha (compacto) */}
      {recent.length > 1 && (
        <>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: 3, color: C.muted, margin: '40px 0 16px' }}>
            🏆 GANADORES POR FECHA
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {recent.map((f) => (
              <div
                key={f.round}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 20,
                  padding: '16px 28px',
                  borderRadius: 20,
                  background: 'rgba(255,255,255,0.03)',
                }}
              >
                <span style={{ fontSize: 28, fontWeight: 800, color: C.muted, minWidth: 150 }}>
                  {f.fecha ? `Fecha ${f.fecha}` : 'Fecha'}
                </span>
                <span style={{ fontSize: 34, fontWeight: 800, flex: 1, minWidth: 0 }}>{f.winners.join(', ')}</span>
                <span style={{ fontSize: 30, fontWeight: 800, color: C.gold }}>{f.points} pts</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Pie */}
      <div style={{ marginTop: 'auto', paddingTop: 24, textAlign: 'center' }}>
        <div style={{ height: 2, background: 'rgba(255,255,255,0.08)', marginBottom: 22 }} />
        <div style={{ fontSize: 34, fontWeight: 800, color: C.accent, letterSpacing: 1 }}>
          prode-argentino.vercel.app
        </div>
        <div style={{ fontSize: 26, color: C.muted, marginTop: 6 }}>Pronosticá, sumá puntos y ganá la fecha ⚽</div>
      </div>
    </div>
  )
})

export default AwardsStoryCard
