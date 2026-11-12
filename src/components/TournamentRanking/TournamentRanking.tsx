'use client'

import { useRef, useState } from 'react'
import { getGroupMemberResults, type MemberResult } from '@/app/grupos/actions'
import { standingPositions, type Standing } from '@/lib/phases'
import { downloadNodeAsJpg, slugify } from '@/lib/exportImage'
import { initials, PosBadge } from '@/components/Standings/StandingsTable'
import StandingsStory from '@/components/Standings/StandingsStory'
import { IconCamera, IconChevron, IconTable } from '@/components/Icons/Icons'
import styles from './TournamentRanking.module.css'

// Tabla general del torneo + historial de cada jugador EN LA MISMA TABLA:
// tocás una fila y se despliegan sus resultados fecha por fecha.
export default function TournamentRanking({
  groupId,
  groupName,
  rows,
  labels,
  playoffRounds,
  meId,
}: {
  groupId: string
  groupName: string
  rows: Standing[]
  labels: Record<string, string>
  playoffRounds: string[]
  meId?: string
}) {
  const exportRef = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, MemberResult[]>>({})
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [errorId, setErrorId] = useState<string | null>(null)
  const pos = standingPositions(rows)
  const playoffSet = new Set(playoffRounds)

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
      await downloadNodeAsJpg(exportRef.current, `prode-general-${slugify(groupName)}.jpg`, { width: 1080, height: 1920 })
    } catch (e) {
      console.error(e)
      alert('No se pudo generar la imagen.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="glass-panel panel-pad" style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.9rem' }}>
        <div>
          <h2 className="section-title" style={{ marginBottom: '0.3rem' }}>
            <span className="icon" style={{ display: 'inline-flex' }}><IconTable size={22} /></span>
            Tabla general
          </h2>
          <div className="muted" style={{ fontSize: '0.88rem' }}>Fase de Grupos + Playoffs. Tocá un jugador para ver sus resultados.</div>
        </div>
        <button type="button" onClick={exportImage} disabled={busy || rows.length === 0} className="btn-ghost btn-sm">
          <IconCamera />
          {busy ? 'Generando…' : 'Compartir'}
        </button>
      </div>

      {rows.length === 0 && <div className="empty-state">Aún no hay puntos en este torneo.</div>}

      <div className={styles.list}>
        {rows.map((m, i) => {
          const open = openId === m.userId
          return (
            <div key={m.userId} className={`${styles.item} ${m.userId === meId ? styles.me : ''} ${open ? styles.open : ''}`}>
              <button type="button" className={styles.rowBtn} onClick={() => toggle(m.userId)} aria-expanded={open}>
                <PosBadge pos={pos[i]} />
                <span className="avatar" aria-hidden="true">{initials(m.name)}</span>
                <span className={styles.name}>{m.name}</span>
                {m.userId === meId && <span className="tag tag-celeste">Vos</span>}
                <span className={styles.exacts} title="Resultados exactos">{m.exacts} <small>ex</small></span>
                <span className={styles.pts}>{m.points}</span>
                <span className={styles.chev} aria-hidden="true"><IconChevron size={18} /></span>
              </button>

              {open && (
                <div className={styles.detail}>
                  {loadingId === m.userId && <div className="muted" style={{ fontSize: '0.85rem' }}>Cargando…</div>}
                  {errorId === m.userId && <div style={{ color: 'var(--color-warning)', fontSize: '0.85rem' }}>No se pudieron cargar los resultados.</div>}
                  {results[m.userId] && <MemberByFecha rows={results[m.userId]} labels={labels} playoffSet={playoffSet} />}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <StandingsStory
        ref={exportRef}
        badge="TABLA GENERAL"
        title="GENERAL"
        context={groupName}
        rows={rows}
        footnote="Fase de Grupos + Playoffs"
        style={{ position: 'fixed', left: -20000, top: 0 }}
      />
    </section>
  )
}

function MemberByFecha({ rows, labels, playoffSet }: { rows: MemberResult[]; labels: Record<string, string>; playoffSet: Set<string> }) {
  if (rows.length === 0) {
    return <div className="muted" style={{ fontSize: '0.85rem' }}>Todavía no tiene pronósticos visibles en este torneo.</div>
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
        return (
          <div key={round}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
              <span className="display" style={{ fontSize: '1.1rem', color: playoffSet.has(round) ? '#fde68a' : undefined }}>{labels[round] ?? 'Fecha'}</span>
              <span className="tag tag-celeste">{total} pts</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {ms.map((x) => {
                const finished = x.status === 'finished'
                return (
                  <div key={x.match_id} className={styles.result}>
                    <span className={styles.resultTeams}>
                      {x.home_team} <span className="muted">vs</span> {x.away_team}
                    </span>
                    {finished && <span className={styles.resultReal} title="Resultado">{x.home_score}-{x.away_score}</span>}
                    <span className={styles.resultPred} title="Pronóstico">{x.predicted_home_score}-{x.predicted_away_score}</span>
                    {finished && x.points_earned != null ? (
                      <span className={styles.resultPts} data-zero={x.points_earned === 0 || undefined}>+{x.points_earned}</span>
                    ) : (
                      <span className={styles.resultLive}>{x.status === 'in_progress' ? 'VIVO' : '·'}</span>
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
