import { forwardRef, type CSSProperties } from 'react'
import { standingPositions, type Standing } from '@/lib/phases'

// Placa 9:16 (1080×1920) para historias de Instagram/WhatsApp. Estilos en
// línea y colores sólidos (html2canvas no soporta texto con degradé).
const C = {
  bg: '#060c18',
  accent: '#38bdf8',
  celeste: '#74acdf',
  text: '#f1f5f9',
  muted: '#94a3b8',
  gold: '#fbbf24',
  goldSoft: '#fde68a',
}

const display = 'var(--font-display)'

export type StoryProps = {
  badge: string // "PLAYOFFS" | "FASE DE GRUPOS"
  title: string // "TABLA" | "CAMPEÓN"
  context: string // nombre del torneo / "Ranking general"
  season?: string
  rows: Standing[]
  champion?: boolean // destaca al 1º como campeón
  footnote?: string
  style?: CSSProperties
}

const StandingsStory = forwardRef<HTMLDivElement, StoryProps>(function StandingsStory(
  { badge, title, context, season = 'TORNEO CLAUSURA 2026', rows, champion, footnote, style },
  ref
) {
  const pos = standingPositions(rows)
  const leaders = rows.filter((_, i) => pos[i] === 1 && rows[i].points > 0)
  const list = rows.slice(0, champion ? 9 : 12)

  return (
    <div
      ref={ref}
      style={{
        position: 'relative',
        width: 1080,
        height: 1920,
        padding: '84px 80px 70px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        color: C.text,
        fontFamily: 'var(--font-body)',
        background: `radial-gradient(1100px 760px at 50% -8%, rgba(0,158,227,0.30), transparent 62%),
          radial-gradient(800px 700px at 100% 100%, rgba(251,191,36,0.10), transparent 60%),
          linear-gradient(170deg, #0a1426 0%, #08111f 55%, #050a14 100%)`,
        ...style,
      }}
    >
      {/* Bastones albicelestes */}
      <div
        style={{
          position: 'absolute',
          inset: '0 0 auto 0',
          height: 760,
          background: 'repeating-linear-gradient(90deg, rgba(116,172,223,0.08) 0 90px, rgba(255,255,255,0.02) 90px 180px)',
          opacity: 0.9,
          WebkitMaskImage: 'linear-gradient(180deg, #000, transparent)',
          maskImage: 'linear-gradient(180deg, #000, transparent)',
        }}
      />

      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: display, fontSize: 40, fontWeight: 900, letterSpacing: 6 }}>⚽ PRODE</span>
        <span
          style={{
            fontFamily: display,
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: 4,
            padding: '10px 22px',
            borderRadius: 999,
            border: `2px solid ${champion ? 'rgba(251,191,36,0.5)' : 'rgba(56,189,248,0.45)'}`,
            color: champion ? C.goldSoft : '#7dd3fc',
            background: champion ? 'rgba(251,191,36,0.10)' : 'rgba(56,189,248,0.10)',
          }}
        >
          {badge}
        </span>
      </div>

      <div style={{ position: 'relative', marginTop: 56 }}>
        <div style={{ fontFamily: display, fontSize: 30, fontWeight: 700, letterSpacing: 8, color: C.celeste }}>{season}</div>
        <div style={{ fontFamily: display, fontSize: 168, fontWeight: 900, lineHeight: 0.9, letterSpacing: -1, marginTop: 8, color: champion ? C.gold : C.text }}>
          {title}
        </div>
        <div style={{ fontSize: 40, fontWeight: 600, color: C.muted, marginTop: 14 }}>{context}</div>
      </div>

      {champion && leaders.length > 0 && (
        <div
          style={{
            position: 'relative',
            marginTop: 44,
            padding: '40px 46px',
            borderRadius: 40,
            border: '3px solid rgba(251,191,36,0.4)',
            background: 'linear-gradient(120deg, rgba(251,191,36,0.20), rgba(56,189,248,0.07))',
            display: 'flex',
            alignItems: 'center',
            gap: 36,
          }}
        >
          <div style={{ fontSize: 150, lineHeight: 1 }}>🏆</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: display, fontSize: 30, fontWeight: 800, letterSpacing: 6, color: C.gold }}>
              {leaders.length > 1 ? 'CAMPEONES' : 'CAMPEÓN'}
            </div>
            <div style={{ fontFamily: display, fontSize: 92, fontWeight: 900, lineHeight: 0.95, marginTop: 6, textTransform: 'uppercase' }}>
              {leaders.map((l) => l.name).join(' · ')}
            </div>
            <div style={{ fontSize: 36, fontWeight: 700, color: C.goldSoft, marginTop: 12 }}>
              {leaders[0].points} puntos · {leaders[0].exacts} exactos
            </div>
          </div>
        </div>
      )}

      <div style={{ position: 'relative', marginTop: 40, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', padding: '0 30px', fontFamily: display, fontSize: 24, fontWeight: 800, letterSpacing: 4, color: C.muted }}>
          <span style={{ width: 96 }}>POS</span>
          <span style={{ flex: 1 }}>JUGADOR</span>
          <span style={{ width: 150, textAlign: 'right' }}>EXACTOS</span>
          <span style={{ width: 130, textAlign: 'right' }}>PTS</span>
        </div>
        {list.length === 0 && <div style={{ fontSize: 34, color: C.muted, padding: '20px 30px' }}>Todavía no hay puntos.</div>}
        {list.map((r, i) => {
          const p = pos[i]
          const medal = p === 1 ? C.gold : p === 2 ? '#cbd5e1' : p === 3 ? '#d9905a' : null
          return (
            <div
              key={r.userId}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0 30px',
                height: 96,
                borderRadius: 24,
                background: p === 1 ? 'rgba(251,191,36,0.13)' : p <= 3 ? 'rgba(56,189,248,0.09)' : 'rgba(255,255,255,0.04)',
                border: `2px solid ${p === 1 ? 'rgba(251,191,36,0.35)' : 'rgba(255,255,255,0.05)'}`,
              }}
            >
              <span style={{ width: 96 }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 60,
                    height: 60,
                    borderRadius: 16,
                    fontFamily: display,
                    fontSize: 38,
                    fontWeight: 900,
                    color: medal ? '#1a1206' : C.muted,
                    background: medal || 'rgba(148,163,184,0.12)',
                  }}
                >
                  {p}
                </span>
              </span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 42, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {r.name}
              </span>
              <span style={{ width: 150, textAlign: 'right', fontFamily: display, fontSize: 44, fontWeight: 700, color: C.muted }}>{r.exacts}</span>
              <span style={{ width: 130, textAlign: 'right', fontFamily: display, fontSize: 56, fontWeight: 900, color: p === 1 ? C.gold : C.accent }}>{r.points}</span>
            </div>
          )
        })}
        {rows.length > list.length && (
          <div style={{ fontSize: 28, color: C.muted, textAlign: 'center', marginTop: 6 }}>+ {rows.length - list.length} jugadores más</div>
        )}
      </div>

      <div style={{ position: 'relative', marginTop: 'auto', textAlign: 'center' }}>
        {footnote && <div style={{ fontSize: 28, color: C.muted, marginBottom: 18 }}>{footnote}</div>}
        <div style={{ height: 3, background: 'linear-gradient(90deg, transparent, rgba(116,172,223,0.6), transparent)', marginBottom: 24 }} />
        <div style={{ fontFamily: display, fontSize: 44, fontWeight: 800, letterSpacing: 3, color: C.accent }}>PRODE-ARGENTINO.VERCEL.APP</div>
      </div>
    </div>
  )
})

export default StandingsStory
