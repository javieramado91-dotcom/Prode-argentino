import { forwardRef, type CSSProperties } from 'react'
import { diaLargo, hora24, diaHora24 } from '@/lib/fecha'

// Placa 9:16 (1080×1920) que promociona la fecha que viene de un torneo.
// Presentacional: recibe todo calculado. TournamentFlyer la monta fuera de
// pantalla y la captura con html2canvas.
//
// Sin escudos a propósito: los logos de ESPN son de otro dominio y, si el CDN
// no manda cabeceras CORS, "tiñen" el canvas y `toDataURL` tira SecurityError
// —o sea, se cae la placa entera—. El resto de las placas tampoco los usa.
const C = {
  primary: '#009ee3',
  accent: '#38bdf8',
  text: '#f1f5f9',
  muted: '#8b9bb4',
  gold: '#fbbf24',
}

export type FlyerMatchView = {
  id: string
  home: string
  away: string
  date: string
  featured: boolean
}

export type FlyerData = {
  groupName: string
  fechaLabel: string
  started: boolean
  kickoff: string
  matches: FlyerMatchView[]
  lastWinner: { fechaLabel: string; names: string[]; points: number } | null
  inviteCode: string
}

const FlyerStoryCard = forwardRef<HTMLDivElement, { data: FlyerData; style?: CSSProperties }>(
  function FlyerStoryCard({ data, style }, ref) {
    const { groupName, fechaLabel, started, kickoff, matches, lastWinner, inviteCode } = data
    const destacado = matches.find((m) => m.featured) ?? null

    // Una fecha del torneo argentino son 15 partidos (30 equipos). A partir de
    // 10 filas hay que apretar la placa o el pie se va de los 1920 px de alto:
    // medido con las 15, entra justo con los tamaños `dense`.
    const compact = matches.length > 9
    const dense = matches.length > 12
    const rowGap = dense ? 7 : compact ? 9 : 14
    const rowPad = dense ? '8px 24px' : compact ? '12px 26px' : '18px 30px'
    const teamSize = dense ? 26 : compact ? 31 : 38
    const timeSize = dense ? 19 : compact ? 21 : 25

    return (
      <div
        ref={ref}
        style={{
          width: 1080,
          height: 1920,
          padding: '70px 72px 60px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          background:
            'radial-gradient(1200px 900px at 50% -10%, rgba(0,158,227,0.24), transparent 60%), linear-gradient(165deg, #0b1220 0%, #0f1e33 55%, #0a1120 100%)',
          color: C.text,
          fontFamily: 'Outfit, system-ui, sans-serif',
          ...style,
        }}
      >
        {/* Marca */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 40 }}>⚽</span>
            <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: 3 }}>PRODE ARGENTINO</span>
          </div>
          <span style={{ fontSize: 24, fontWeight: 800, color: C.muted, letterSpacing: 2 }}>
            {started ? 'EN JUEGO' : 'SE VIENE'}
          </span>
        </div>

        {/* Fecha + torneo */}
        <div style={{ marginTop: dense ? 26 : 34 }}>
          <div
            style={{
              fontSize: dense ? 112 : 132,
              fontWeight: 900,
              lineHeight: 0.95,
              letterSpacing: -4,
              textTransform: 'uppercase',
              // Color plano y no el degradado con `background-clip: text` de la
              // app: html2canvas no lo soporta y termina pintando el recuadro
              // entero de azul con las letras caladas. Verificado capturando.
              color: C.accent,
            }}
          >
            {fechaLabel}
          </div>
          <div style={{ fontSize: dense ? 38 : 42, fontWeight: 800, marginTop: 12, lineHeight: 1.1 }}>{groupName}</div>
        </div>

        {/* Cuándo arranca */}
        <div
          style={{
            marginTop: dense ? 18 : 26,
            borderRadius: 28,
            padding: dense ? '20px 32px' : '26px 34px',
            background: 'linear-gradient(135deg, rgba(0,158,227,0.22), rgba(56,189,248,0.04))',
            border: '2px solid rgba(56,189,248,0.24)',
            display: 'flex',
            alignItems: 'center',
            gap: 24,
          }}
        >
          <span style={{ fontSize: dense ? 46 : 56, lineHeight: 1 }}>🚦</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: 4, color: C.accent }}>
              {started ? 'SIGUE' : 'ARRANCA'}
            </div>
            <div style={{ fontSize: dense ? 36 : 40, fontWeight: 900, marginTop: 4 }}>
              {diaLargo(kickoff)} · {hora24(kickoff)}
            </div>
          </div>
        </div>

        {/* Partido de la fecha (vale doble) */}
        {destacado && (
          <div
            style={{
              marginTop: dense ? 12 : 18,
              borderRadius: 26,
              padding: dense ? '16px 30px' : '22px 32px',
              background: 'rgba(251,191,36,0.13)',
              border: `2px solid ${C.gold}`,
              display: 'flex',
              alignItems: 'center',
              gap: 22,
            }}
          >
            <span style={{ fontSize: dense ? 42 : 50, lineHeight: 1 }}>⭐</span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 23, fontWeight: 800, letterSpacing: 3, color: C.gold }}>
                PARTIDO DE LA FECHA · VALE DOBLE
              </div>
              <div style={{ fontSize: dense ? 33 : 38, fontWeight: 900, marginTop: 4 }}>
                {destacado.home} vs {destacado.away}
              </div>
            </div>
          </div>
        )}

        {/* Los partidos */}
        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: 3, color: C.muted, margin: dense ? '20px 0 10px' : '30px 0 14px' }}>
          📋 LOS PARTIDOS
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: rowGap }}>
          {matches.map((m) => (
            <div
              key={m.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 18,
                padding: rowPad,
                borderRadius: 18,
                background: m.featured ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.04)',
                border: m.featured ? '2px solid rgba(251,191,36,0.45)' : '2px solid rgba(255,255,255,0.05)',
              }}
            >
              <span style={{ flex: 1, minWidth: 0, fontSize: teamSize, fontWeight: 800 }}>
                {m.home} <span style={{ color: C.muted, fontWeight: 700 }}>vs</span> {m.away}
              </span>
              {m.featured && (
                <span style={{ fontSize: timeSize, fontWeight: 900, color: C.gold, letterSpacing: 1 }}>★ x2</span>
              )}
              <span style={{ fontSize: timeSize, fontWeight: 700, color: C.muted, whiteSpace: 'nowrap' }}>
                {diaHora24(m.date)}
              </span>
            </div>
          ))}
        </div>

        {/* Último ganador */}
        <div
          style={{
            marginTop: dense ? 18 : 26,
            borderRadius: 26,
            padding: dense ? '18px 30px' : '24px 32px',
            background: 'rgba(255,255,255,0.04)',
            border: '2px solid rgba(255,255,255,0.07)',
            display: 'flex',
            alignItems: 'center',
            gap: 24,
          }}
        >
          <span style={{ fontSize: dense ? 48 : 58, lineHeight: 1 }}>🏆</span>
          {lastWinner ? (
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 23, fontWeight: 800, letterSpacing: 3, color: C.muted }}>
                ÚLTIMO GANADOR · {lastWinner.fechaLabel.toUpperCase()}
              </div>
              <div style={{ fontSize: dense ? 40 : 46, fontWeight: 900, marginTop: 4, lineHeight: 1.1 }}>
                {lastWinner.names.join(' · ')}
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: C.gold }}>{lastWinner.points} puntos</div>
            </div>
          ) : (
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 23, fontWeight: 800, letterSpacing: 3, color: C.muted }}>
                TODAVÍA SIN GANADORES
              </div>
              <div style={{ fontSize: 40, fontWeight: 900, marginTop: 4 }}>El ranking está para estrenar</div>
            </div>
          )}
        </div>

        {/* Pie */}
        <div style={{ marginTop: 'auto', paddingTop: 22, textAlign: 'center' }}>
          <div style={{ height: 2, background: 'rgba(255,255,255,0.08)', marginBottom: 20 }} />
          <div style={{ fontSize: 32, fontWeight: 800, color: C.accent, letterSpacing: 1 }}>
            prode-argentino.vercel.app
          </div>
          <div style={{ fontSize: 26, color: C.muted, marginTop: 6 }}>
            Sumate al torneo con el código{' '}
            <span style={{ color: C.text, fontWeight: 800, letterSpacing: 2 }}>{inviteCode}</span>
          </div>
          <div style={{ fontSize: 22, color: C.muted, letterSpacing: 6, marginTop: 16, opacity: 0.8 }}>
            BY <span style={{ color: C.accent, fontWeight: 900 }}>JA</span>
          </div>
        </div>
      </div>
    )
  }
)

export default FlyerStoryCard
