import { standingPositions, type Standing } from '@/lib/phases'
import styles from './Standings.module.css'

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.substring(0, 2).toUpperCase()
}

export function PosBadge({ pos }: { pos: number }) {
  return <span className={`pos-badge ${pos <= 3 ? `pos-${pos}` : ''}`}>{pos}</span>
}

// Tabla de posiciones (presentacional): Pos · Jugador · Exactos · Pts.
export default function StandingsTable({
  rows,
  meId,
  emptyText = 'Todavía no hay puntos.',
  caption,
}: {
  rows: Standing[]
  meId?: string
  emptyText?: string
  caption?: string
}) {
  if (rows.length === 0) return <div className="empty-state">{emptyText}</div>
  const pos = standingPositions(rows)
  return (
    <div className={styles.table} role="table" aria-label={caption || 'Tabla de posiciones'}>
      <div className={`${styles.row} ${styles.head}`} role="row">
        <span role="columnheader">Pos</span>
        <span role="columnheader">Jugador</span>
        <span role="columnheader" title="Resultados exactos">Exactos</span>
        <span role="columnheader">Pts</span>
      </div>
      {rows.map((r, i) => {
        const me = r.userId === meId
        return (
          <div
            key={r.userId}
            role="row"
            className={`${styles.row} ${pos[i] <= 3 && r.points > 0 ? styles.top : ''} ${me ? styles.me : ''}`}
          >
            <span role="cell"><PosBadge pos={pos[i]} /></span>
            <span role="cell" className={styles.player}>
              <span className="avatar" aria-hidden="true">{initials(r.name)}</span>
              <span className={styles.name}>{r.name}</span>
              {me && <span className="tag tag-celeste">Vos</span>}
            </span>
            <span role="cell" className={styles.exacts}>{r.exacts}</span>
            <strong role="cell" className={styles.pts}>{r.points}</strong>
          </div>
        )
      })}
    </div>
  )
}

// Podio de los 3 primeros (2º · 1º · 3º).
export function Podium({ rows }: { rows: Standing[] }) {
  const top = rows.slice(0, 3)
  if (top.length === 0 || top[0].points <= 0) return null
  const pos = standingPositions(rows)
  const order = [1, 0, 2].filter((i) => top[i])
  return (
    <div className={styles.podium} aria-label="Podio">
      {order.map((i) => {
        const r = top[i]
        const p = pos[i]
        return (
          <div key={r.userId} className={`${styles.step} ${styles[`step${i + 1}`]}`}>
            <span className={`avatar ${styles.podiumAvatar}`} aria-hidden="true">{initials(r.name)}</span>
            <span className={styles.podiumName}>{r.name}</span>
            <span className={styles.podiumPts}><span className="num">{r.points}</span> pts</span>
            <div className={styles.block}>
              <span className={styles.blockPos}>{p}º</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
