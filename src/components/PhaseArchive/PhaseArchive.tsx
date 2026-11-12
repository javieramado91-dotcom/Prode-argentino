'use client'

import { useRef, useState, type ReactNode } from 'react'
import type { Award, FechaWinner } from '@/lib/awards'
import { standingPositions, type Standing } from '@/lib/phases'
import { downloadNodeAsJpg, slugify } from '@/lib/exportImage'
import StandingsTable, { Podium } from '@/components/Standings/StandingsTable'
import StandingsStory from '@/components/Standings/StandingsStory'
import FechaWinners from '@/components/SeasonAwards/FechaWinners'
import AwardsShare from '@/components/SeasonAwards/AwardsShare'
import { IconArchive, IconCamera, IconCrown, IconMedal, IconStar, IconTable, IconTarget, IconTrophy, IconFire, IconChart } from '@/components/Icons/Icons'
import styles from './PhaseArchive.module.css'

export type ArchiveColumn = { round: string; short: string; label: string }
export type ArchiveCell = { points: number; exacts: number }

export type PhaseArchiveData = {
  phaseName: string // "Fase de Grupos"
  season: string // "Torneo Clausura 2026"
  context: string // nombre del torneo o "Ranking general"
  dateRange: string
  matchCount: number
  standings: Standing[]
  fechaWinners: FechaWinner[]
  awards: Award[]
  columns: ArchiveColumn[]
  matrix: Record<string, Record<string, ArchiveCell>>
}

type View = 'tabla' | 'fechas' | 'ganadores' | 'premios'

// "Salón de la fama" de una fase ya cerrada: queda como recuerdo con el
// campeón, la tabla final, cómo salió cada uno fecha por fecha, los ganadores
// de cada fecha y los premios.
export default function PhaseArchive({ data, meId }: { data: PhaseArchiveData; meId?: string }) {
  const [view, setView] = useState<View>('tabla')
  const storyRef = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false)

  const { standings } = data
  const pos = standingPositions(standings)
  const champions = standings.filter((r, i) => pos[i] === 1 && r.points > 0)
  const totalExacts = standings.reduce((n, r) => n + r.exacts, 0)
  const winsByUser = new Map<string, number>()
  for (const fw of data.fechaWinners) for (const id of fw.winnerIds) winsByUser.set(id, (winsByUser.get(id) || 0) + 1)
  const record = data.fechaWinners.reduce<FechaWinner | null>((best, f) => (!best || f.points > best.points ? f : best), null)
  const me = meId ? standings.findIndex((r) => r.userId === meId) : -1

  async function shareChampion() {
    if (!storyRef.current) return
    setBusy(true)
    try {
      await downloadNodeAsJpg(storyRef.current, `prode-campeon-${slugify(data.phaseName)}-${slugify(data.context)}.jpg`, { width: 1080, height: 1920 })
    } catch (e) {
      console.error(e)
      alert('No se pudo generar la imagen. Probá de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  if (standings.length === 0 || champions.length === 0) {
    return (
      <div className="glass-panel empty-state">
        Esta fase no tiene puntos registrados en este torneo.
      </div>
    )
  }

  return (
    <section className={styles.wrap}>
      {/* Encabezado del archivo */}
      <div className={styles.archiveHead}>
        <span className="tag tag-gold"><IconArchive /> Fase cerrada</span>
        <span className="muted" style={{ fontSize: '0.85rem' }}>
          {data.season} · {data.dateRange} · {data.columns.length} fechas · {data.matchCount} partidos
        </span>
      </div>

      {/* Campeón */}
      <div className={styles.hero}>
        <div className={styles.heroShine} aria-hidden="true" />
        <div className={styles.heroCrown} aria-hidden="true"><IconCrown size={44} /></div>
        <div className={styles.heroBody}>
          <div className={styles.heroEyebrow}>
            {champions.length > 1 ? 'Campeones' : 'Campeón'} de la {data.phaseName}
          </div>
          <div className={styles.heroName}>{champions.map((c) => c.name).join(' · ')}</div>
          <div className={styles.heroMeta}>
            <span><strong className="num">{champions[0].points}</strong> pts</span>
            <span><strong className="num">{champions[0].exacts}</strong> exactos</span>
            {winsByUser.get(champions[0].userId) ? (
              <span><strong className="num">{winsByUser.get(champions[0].userId)}</strong> fechas ganadas</span>
            ) : null}
          </div>
        </div>
        <button type="button" className="btn-gold" onClick={shareChampion} disabled={busy}>
          <IconCamera />
          {busy ? 'Generando…' : 'Compartir'}
        </button>
      </div>

      {/* Números de la fase */}
      <div className={styles.stats}>
        <Stat icon={<IconTable />} label="Jugadores" value={standings.length} />
        <Stat icon={<IconTarget />} label="Exactos totales" value={totalExacts} />
        <Stat icon={<IconFire />} label="Fecha récord" value={record ? `${record.points} pts` : '—'} hint={record ? `${record.winners.join(', ')} · ${record.label}` : undefined} />
        {me >= 0 && <Stat icon={<IconMedal />} label="Tu puesto final" value={`${pos[me]}º`} hint={`${standings[me].points} pts`} accent />}
      </div>

      <div role="tablist" className="segmented" style={{ margin: '1.25rem 0 1rem' }}>
        {([
          ['tabla', 'Tabla final', <IconTrophy key="i" />],
          ['fechas', 'Fecha por fecha', <IconChart key="i" />],
          ['ganadores', 'Ganadores', <IconStar key="i" />],
          ['premios', 'Premios', <IconMedal key="i" />],
        ] as [View, string, ReactNode][]).map(([k, label, icon]) => (
          <button key={k} type="button" role="tab" aria-selected={view === k} onClick={() => setView(k)}>
            {icon}
            {label}
          </button>
        ))}
      </div>

      {view === 'tabla' && (
        <div className="glass-panel panel-pad">
          <Podium rows={standings} />
          <StandingsTable rows={standings} meId={meId} caption={`Tabla final ${data.phaseName}`} />
          <p className="muted" style={{ fontSize: '0.78rem', marginTop: '0.65rem' }}>
            A igual puntaje, desempata la cantidad de resultados exactos.
          </p>
        </div>
      )}

      {view === 'fechas' && <Matrix data={data} meId={meId} />}

      {view === 'ganadores' && (
        data.fechaWinners.length > 0
          ? <FechaWinners title={data.context} fechas={data.fechaWinners} />
          : <div className="glass-panel empty-state">No hay fechas cerradas.</div>
      )}

      {view === 'premios' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
            <AwardsShare title={data.context} fechaWinners={data.fechaWinners} awards={data.awards} badge={data.phaseName.toUpperCase()} />
          </div>
          <div className={styles.awards}>
            {data.awards.map((a) => (
              <div key={a.key} className={`glass-panel ${styles.award}`}>
                <div className={styles.awardIcon} aria-hidden="true">{a.icon}</div>
                <div className={styles.awardTitle}>{a.title}</div>
                <div className={styles.awardWinner}>
                  {a.winnerName ?? '—'}
                  {a.tie && <span className="muted" style={{ fontWeight: 600, fontSize: '0.8rem' }}> (empate)</span>}
                </div>
                <div className="muted" style={{ fontSize: '0.82rem' }}>{a.detail}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <StandingsStory
        ref={storyRef}
        badge={data.phaseName.toUpperCase()}
        title="CAMPEÓN"
        context={data.context}
        season={data.season.toUpperCase()}
        rows={standings}
        champion
        footnote={`Tabla final · ${data.columns.length} fechas`}
        style={{ position: 'fixed', left: -20000, top: 0 }}
      />
    </section>
  )
}

function Stat({ icon, label, value, hint, accent }: { icon: ReactNode; label: string; value: string | number; hint?: string; accent?: boolean }) {
  return (
    <div className={`glass-panel ${styles.stat} ${accent ? styles.statAccent : ''}`}>
      <span className={styles.statIcon} aria-hidden="true">{icon}</span>
      <span className={styles.statValue}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
      {hint && <span className={styles.statHint}>{hint}</span>}
    </div>
  )
}

// Matriz jugador × fecha: cuántos puntos hizo cada uno en cada fecha.
function Matrix({ data, meId }: { data: PhaseArchiveData; meId?: string }) {
  const winnersByRound = new Map(data.fechaWinners.map((f) => [f.round, new Set(f.winnerIds)]))
  const maxByRound = new Map<string, number>()
  for (const col of data.columns) {
    let max = 0
    for (const row of Object.values(data.matrix)) max = Math.max(max, row[col.round]?.points ?? 0)
    maxByRound.set(col.round, max)
  }
  const pos = standingPositions(data.standings)

  return (
    <div className="glass-panel" style={{ padding: '0.75rem' }}>
      <div className={styles.matrixScroll}>
        <table className={styles.matrix}>
          <thead>
            <tr>
              <th className={styles.stickyCol} scope="col">Jugador</th>
              {data.columns.map((c) => (
                <th key={c.round} scope="col" title={c.label}>{c.short}</th>
              ))}
              <th scope="col" className={styles.totalCol}>Total</th>
            </tr>
          </thead>
          <tbody>
            {data.standings.map((r, i) => {
              const cells = data.matrix[r.userId] || {}
              return (
                <tr key={r.userId} className={r.userId === meId ? styles.meRow : undefined}>
                  <th scope="row" className={styles.stickyCol}>
                    <span className={styles.rowName}>
                      <span className={`pos-badge ${pos[i] <= 3 ? `pos-${pos[i]}` : ''}`} style={{ width: 24, height: 24, fontSize: '0.85rem', borderRadius: 7 }}>{pos[i]}</span>
                      <span className={styles.rowNameText}>{r.name}</span>
                    </span>
                  </th>
                  {data.columns.map((c) => {
                    const cell = cells[c.round]
                    const won = winnersByRound.get(c.round)?.has(r.userId)
                    const max = maxByRound.get(c.round) || 1
                    const ratio = cell ? cell.points / max : 0
                    return (
                      <td
                        key={c.round}
                        className={won ? styles.won : undefined}
                        style={!won && cell ? { background: `rgba(56,189,248,${(0.05 + ratio * 0.32).toFixed(3)})` } : undefined}
                        title={`${r.name} · ${c.label}: ${cell ? `${cell.points} pts, ${cell.exacts} exactos` : 'sin puntos'}${won ? ' · ganador de la fecha' : ''}`}
                      >
                        {cell ? cell.points : '–'}
                      </td>
                    )
                  })}
                  <td className={styles.totalCol}>{r.points}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className={styles.legend}>
        <span><i className={styles.legendWon} /> Ganó la fecha</span>
        <span><i className={styles.legendHeat} /> Más intenso = más puntos en esa fecha</span>
      </div>
    </div>
  )
}

