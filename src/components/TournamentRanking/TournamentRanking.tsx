'use client'

import { useRef, useState, forwardRef } from 'react'
import html2canvas from 'html2canvas'
import lb from '../Leaderboard/Leaderboard.module.css'
import { getGroupMemberResults, type MemberResult } from '@/app/grupos/actions'

type Member = { id: string; name: string; points: number }

// Ranking del torneo + historial por fecha de cada jugador EN LA MISMA TABLA:
// tocás una fila y se despliegan sus resultados fecha por fecha.
export default function TournamentRanking({
  groupId,
  groupName,
  members,
  roundOrder,
}: {
  groupId: string
  groupName: string
  members: Member[]
  roundOrder: string[]
}) {
  const exportRef = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, MemberResult[]>>({})
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [errorId, setErrorId] = useState<string | null>(null)

  const roundNum = new Map(roundOrder.map((r, i) => [r, i + 1]))

  async function toggle(id: string) {
    if (openId === id) {
      setOpenId(null)
      return
    }
    setOpenId(id)
    if (!results[id]) {
      setLoadingId(id)
      setErrorId(null)
      try {
        const r = await getGroupMemberResults(groupId, id)
        setResults((prev) => ({ ...prev, [id]: r }))
      } catch {
        setErrorId(id)
      } finally {
        setLoadingId(null)
      }
    }
  }

  async function exportImage() {
    if (!exportRef.current) return
    setBusy(true)
    try {
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: '#070d1a',
        scale: 2,
        useCORS: true,
        logging: false,
      })
      const image = canvas.toDataURL('image/jpeg', 0.92)
      const link = document.createElement('a')
      link.href = image
      link.download = `prode-ranking-${new Date().toISOString().slice(0, 10)}.jpg`
      link.click()
    } catch (e) {
      console.error(e)
      alert('No se pudo generar la imagen.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={lb.container}>
      <div className={lb.header}>
        <h2 className="gradient-text">Ranking del torneo</h2>
        <button onClick={exportImage} disabled={busy} className={`btn-primary ${lb.exportBtn}`}>
          {busy ? 'Generando…' : '📸 Compartir en Insta'}
        </button>
      </div>

      <div className={`glass-panel ${lb.rankingBoard}`}>
        <div className={lb.boardHeader}>
          <h3>Prode Argentino - Ranking del Torneo</h3>
        </div>

        <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', color: 'var(--color-text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 0.75rem' }}>
            <span style={{ width: 44 }}>Pos</span>
            <span style={{ flex: 1 }}>Jugador</span>
            <span>Pts</span>
          </div>

          {members.length === 0 && (
            <div className={lb.emptyState}>Aún no hay puntos en este torneo</div>
          )}

          {members.map((m, i) => {
            const open = openId === m.id
            const top3 = i < 3
            return (
              <div
                key={m.id}
                style={{
                  borderRadius: 10,
                  background: top3 ? 'rgba(0,158,227,0.10)' : 'rgba(255,255,255,0.03)',
                  overflow: 'hidden',
                }}
              >
                <button
                  onClick={() => toggle(m.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.7rem 0.9rem',
                    background: 'transparent',
                    border: 'none',
                    color: 'inherit',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ width: 32, textAlign: 'center', fontWeight: 800, fontSize: '1.05rem' }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`}
                  </span>
                  <span
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      flexShrink: 0,
                      background: 'var(--color-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      color: '#fff',
                    }}
                  >
                    {m.name.substring(0, 2).toUpperCase()}
                  </span>
                  <span style={{ flex: 1, fontWeight: 700, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.name}
                  </span>
                  <span style={{ fontWeight: 800, color: 'var(--color-accent)', fontSize: '1.15rem' }}>{m.points}</span>
                  <span style={{ color: 'var(--color-text-muted)', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}>›</span>
                </button>

                {open && (
                  <div style={{ padding: '0 0.9rem 0.9rem' }}>
                    {loadingId === m.id && <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Cargando…</div>}
                    {errorId === m.id && <div style={{ color: 'var(--color-warning)', fontSize: '0.85rem' }}>No se pudieron cargar los resultados.</div>}
                    {results[m.id] && <MemberByFecha rows={results[m.id]} roundNum={roundNum} />}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className={lb.watermark}>Tocá un jugador para ver sus resultados fecha por fecha</div>
      </div>

      {/* Placa exportable (fuera de pantalla): ranking limpio, sin desplegables. */}
      <ExportBoard ref={exportRef} groupName={groupName} members={members} />
    </div>
  )
}

function MemberByFecha({ rows, roundNum }: { rows: MemberResult[]; roundNum: Map<string, number> }) {
  if (rows.length === 0) {
    return <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Todavía no tiene pronósticos visibles en este torneo.</div>
  }
  const byRound = new Map<string, MemberResult[]>()
  for (const r of rows) {
    if (!byRound.has(r.round)) byRound.set(r.round, [])
    byRound.get(r.round)!.push(r)
  }
  const groups = [...byRound.entries()].sort((a, b) => b[0].localeCompare(a[0]))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
      {groups.map(([round, ms]) => {
        const total = ms.reduce((n, x) => n + (x.points_earned ?? 0), 0)
        const num = roundNum.get(round)
        return (
          <div key={round}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
              <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>{num ? `Fecha ${num}` : 'Fecha'}</span>
              <span className="stat-chip" style={{ fontSize: '0.78rem' }}>{total} pts</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {ms.map((x) => {
                const finished = x.status === 'finished'
                return (
                  <div key={x.match_id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', padding: '0.35rem 0.5rem', borderRadius: 8, background: 'rgba(255,255,255,0.03)' }}>
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {x.home_team} <span style={{ color: 'var(--color-text-muted)' }}>vs</span> {x.away_team}
                    </span>
                    {finished && <span style={{ color: 'var(--color-text-muted)', fontWeight: 700 }}>{x.home_score}-{x.away_score}</span>}
                    <span style={{ fontWeight: 700 }}>{x.predicted_home_score}-{x.predicted_away_score}</span>
                    {finished && x.points_earned != null ? (
                      <span style={{ minWidth: 34, textAlign: 'right', fontWeight: 800, color: x.points_earned > 0 ? 'var(--color-success)' : 'var(--color-text-muted)' }}>+{x.points_earned}</span>
                    ) : (
                      <span style={{ minWidth: 34, textAlign: 'right', color: 'var(--color-danger)', fontSize: '0.72rem', fontWeight: 700 }}>{x.status === 'in_progress' ? 'VIVO' : '·'}</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

const ExportBoard = forwardRef<HTMLDivElement, { groupName: string; members: Member[] }>(function ExportBoard(
  { groupName, members },
  ref
) {
  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        left: -20000,
        top: 0,
        width: 1000,
        padding: '64px 64px 52px',
        boxSizing: 'border-box',
        background: 'radial-gradient(900px 700px at 50% -10%, rgba(0,158,227,0.22), transparent 60%), linear-gradient(165deg, #0b1220, #0f1e33 60%, #0a1120)',
        color: '#f1f5f9',
        fontFamily: 'Outfit, system-ui, sans-serif',
      }}
    >
      <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: 2, marginBottom: 6 }}>⚽ PRODE ARGENTINO</div>
      <div style={{ fontSize: 60, fontWeight: 900, lineHeight: 1.05, color: '#38bdf8' }}>{groupName}</div>
      <div style={{ fontSize: 28, color: '#8b9bb4', fontWeight: 600, margin: '4px 0 28px' }}>Ranking del torneo</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {members.length === 0 && <div style={{ fontSize: 28, color: '#8b9bb4' }}>Aún no hay puntos.</div>}
        {members.slice(0, 12).map((m, i) => (
          <div
            key={m.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 24,
              padding: '20px 28px',
              borderRadius: 20,
              background: i < 3 ? 'rgba(56,189,248,0.14)' : 'rgba(255,255,255,0.04)',
              border: i < 3 ? '2px solid rgba(56,189,248,0.35)' : '2px solid rgba(255,255,255,0.05)',
            }}
          >
            <span style={{ width: 64, fontSize: 34, fontWeight: 900, textAlign: 'center' }}>
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`}
            </span>
            <span style={{ flex: 1, fontSize: 40, fontWeight: 800, minWidth: 0 }}>{m.name}</span>
            <span style={{ fontSize: 42, fontWeight: 900, color: '#fbbf24' }}>{m.points} pts</span>
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center', marginTop: 40, fontSize: 26, fontWeight: 700, color: '#38bdf8' }}>
        prode-argentino.vercel.app
      </div>
    </div>
  )
})
