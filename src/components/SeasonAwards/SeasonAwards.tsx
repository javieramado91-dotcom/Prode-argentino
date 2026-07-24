import { computeFechaWinners, computeAwards, type RoundScore } from '@/lib/awards'

// Muestra los premios de la temporada + el ganador de cada fecha.
// Sirve tanto en la general (dashboard) como dentro de un torneo.
export default function SeasonAwards({
  scores,
  roundOrder,
  context,
}: {
  scores: RoundScore[]
  roundOrder: string[]
  context: 'general' | 'torneo'
}) {
  const fechaWinners = computeFechaWinners(scores, roundOrder)
  const awards = computeAwards(scores, fechaWinners)

  if (fechaWinners.length === 0) {
    return (
      <div
        className="glass-panel"
        style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}
      >
        Todavía no hay ninguna fecha terminada. Cuando se cierre la primera fecha vas a ver
        acá al ganador y los premios{context === 'torneo' ? ' del torneo' : ''}. 🏆
      </div>
    )
  }

  return (
    <div>
      {/* Premios de la temporada */}
      <h3 style={{ margin: '0.25rem 0 0.9rem', fontSize: '1.1rem' }}>
        🏅 Premios {context === 'torneo' ? 'del torneo' : 'de la temporada'}
      </h3>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '0.85rem',
          marginBottom: '1.75rem',
        }}
      >
        {awards.map((a) => (
          <div key={a.key} className="glass-panel" style={{ padding: '1.1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.9rem', lineHeight: 1 }}>{a.icon}</div>
            <div style={{ fontWeight: 700, marginTop: '0.4rem', fontSize: '0.92rem' }}>{a.title}</div>
            <div
              style={{
                marginTop: '0.35rem',
                fontSize: '1.05rem',
                fontWeight: 800,
                color: 'var(--color-accent)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {a.winnerName ?? '—'}
              {a.tie && <span style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}> (empate)</span>}
            </div>
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '0.15rem' }}>
              {a.detail}
            </div>
          </div>
        ))}
      </div>

      {/* Ganador de cada fecha */}
      <h3 style={{ margin: '0 0 0.9rem', fontSize: '1.1rem' }}>🏆 Ganador de cada fecha</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {fechaWinners.map((f) => (
          <div
            key={f.round}
            className="glass-panel"
            style={{
              padding: '0.8rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                fontWeight: 800,
                color: 'var(--color-text-muted)',
                minWidth: 74,
                fontSize: '0.9rem',
              }}
            >
              {f.fecha ? `Fecha ${f.fecha}` : 'Fecha'}
            </span>
            <span style={{ fontSize: '1.2rem' }}>🏆</span>
            <span style={{ fontWeight: 700, flex: 1, minWidth: 120 }}>
              {f.winners.join(', ')}
            </span>
            <span
              className="stat-chip"
              style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}
            >
              {f.points} pts
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
