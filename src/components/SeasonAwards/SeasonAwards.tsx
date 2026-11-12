import { computeFechaWinners, computeAwards, type RoundScore } from '@/lib/awards'
import type { RoundInfo } from '@/lib/phases'
import AwardsShare from './AwardsShare'
import FechaWinners from './FechaWinners'

// Premios de una fase + el ganador de cada fecha/ronda.
// Sirve tanto en la general (dashboard) como dentro de un torneo.
export default function SeasonAwards({
  scores,
  roundOrder,
  context,
  title,
  labels,
  roundWord = 'fecha',
  badge,
}: {
  scores: RoundScore[]
  roundOrder: string[]
  context: 'general' | 'torneo'
  title?: string
  labels?: Map<string, RoundInfo>
  roundWord?: 'fecha' | 'ronda'
  badge?: string
}) {
  const fechaWinners = computeFechaWinners(scores, roundOrder, labels)
  const awards = computeAwards(scores, fechaWinners, { roundWord })
  const shareTitle = title || (context === 'torneo' ? 'Torneo' : 'Ranking general')
  const word = roundWord === 'fecha' ? 'fecha' : 'ronda'

  if (fechaWinners.length === 0) {
    return (
      <div className="glass-panel empty-state">
        Todavía no hay ninguna {word} terminada. Cuando se cierre la primera vas a ver acá al ganador
        y los premios{context === 'torneo' ? ' del torneo' : ''}.
      </div>
    )
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          flexWrap: 'wrap',
          margin: '0.25rem 0 0.9rem',
        }}
      >
        <h3 className="section-title" style={{ margin: 0 }}>Premios</h3>
        <AwardsShare title={shareTitle} fechaWinners={fechaWinners} awards={awards} badge={badge} />
      </div>
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
            <div style={{ fontSize: '1.9rem', lineHeight: 1 }} aria-hidden="true">{a.icon}</div>
            <div className="display" style={{ marginTop: '0.5rem', fontSize: '0.98rem', color: 'var(--color-text-muted)', letterSpacing: '0.08em' }}>{a.title}</div>
            <div
              className="display"
              style={{
                marginTop: '0.3rem',
                fontSize: '1.45rem',
                color: 'var(--color-accent)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {a.winnerName ?? '—'}
              {a.tie && <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}> (empate)</span>}
            </div>
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '0.15rem' }}>{a.detail}</div>
          </div>
        ))}
      </div>

      <h3 className="section-title">Ganador de cada {word}</h3>
      <FechaWinners title={shareTitle} fechas={fechaWinners} />
    </div>
  )
}
