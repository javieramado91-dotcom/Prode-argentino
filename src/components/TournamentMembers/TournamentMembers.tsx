'use client'

import { useState } from 'react'
import { getGroupMemberResults, type MemberResult } from '@/app/grupos/actions'

type Member = { id: string; name: string; points: number }

export default function TournamentMembers({
  groupId,
  members,
  roundOrder,
}: {
  groupId: string
  members: Member[]
  roundOrder: string[]
}) {
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

  return (
    <section style={{ marginTop: '2rem' }}>
      <h3 style={{ margin: '0 0 0.35rem', fontSize: '1.15rem' }}>👥 Resultados por jugador</h3>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '0 0 0.9rem' }}>
        Tocá a un jugador para ver sus pronósticos fecha por fecha (solo partidos ya empezados).
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {members.map((m, i) => {
          const open = openId === m.id
          return (
            <div key={m.id} className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
              <button
                onClick={() => toggle(m.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.7rem',
                  padding: '0.75rem 1rem',
                  background: 'transparent',
                  border: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{ width: 26, textAlign: 'center', fontWeight: 800, color: 'var(--color-text-muted)' }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`}
                </span>
                <span style={{ flex: 1, fontWeight: 700, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.name}
                </span>
                <span style={{ fontWeight: 800, color: 'var(--color-accent)' }}>{m.points} pts</span>
                <span style={{ color: 'var(--color-text-muted)', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}>
                  ›
                </span>
              </button>

              {open && (
                <div style={{ padding: '0 1rem 1rem' }}>
                  {loadingId === m.id && <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Cargando…</div>}
                  {errorId === m.id && <div style={{ color: 'var(--color-warning)', fontSize: '0.85rem' }}>No se pudieron cargar los resultados.</div>}
                  {results[m.id] && (
                    <MemberByFecha rows={results[m.id]} roundNum={roundNum} />
                  )}
                </div>
              )}
            </div>
          )
        })}
        {members.length === 0 && (
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Todavía no hay miembros con puntos.</div>
        )}
      </div>
    </section>
  )
}

function MemberByFecha({ rows, roundNum }: { rows: MemberResult[]; roundNum: Map<string, number> }) {
  if (rows.length === 0) {
    return <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Todavía no tiene pronósticos visibles en este torneo.</div>
  }

  // Agrupar por fecha (round), de la más reciente a la más vieja.
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
                  <div
                    key={x.match_id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.82rem',
                      padding: '0.35rem 0.5rem',
                      borderRadius: 8,
                      background: 'rgba(255,255,255,0.03)',
                    }}
                  >
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {x.home_team} <span style={{ color: 'var(--color-text-muted)' }}>vs</span> {x.away_team}
                    </span>
                    {finished && (
                      <span style={{ color: 'var(--color-text-muted)', fontWeight: 700 }}>
                        {x.home_score}-{x.away_score}
                      </span>
                    )}
                    <span style={{ fontWeight: 700 }}>
                      {x.predicted_home_score}-{x.predicted_away_score}
                    </span>
                    {finished && x.points_earned != null ? (
                      <span style={{ minWidth: 34, textAlign: 'right', fontWeight: 800, color: x.points_earned > 0 ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                        +{x.points_earned}
                      </span>
                    ) : (
                      <span style={{ minWidth: 34, textAlign: 'right', color: 'var(--color-danger)', fontSize: '0.72rem', fontWeight: 700 }}>
                        {x.status === 'in_progress' ? 'VIVO' : '·'}
                      </span>
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
