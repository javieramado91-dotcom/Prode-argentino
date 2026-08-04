'use client'

import { forwardRef, useRef, useState, type ReactNode } from 'react'
import html2canvas from 'html2canvas'
import type { FechaStanding, FechaWinner } from '@/lib/awards'
import styles from './FechaWinners.module.css'

export default function FechaWinners({ title, fechas }: { title: string; fechas: FechaWinner[] }) {
  const [openRound, setOpenRound] = useState<string | null>(fechas[0]?.round ?? null)

  return (
    <div className={styles.list}>
      {fechas.map((fecha) => {
        const open = openRound === fecha.round
        const panelId = `tabla-fecha-${fecha.round.replace(/[^a-zA-Z0-9_-]/g, '-')}`
        return (
          <article key={fecha.round} className={`${styles.card} glass-panel`}>
            <button
              type="button"
              className={styles.summary}
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setOpenRound(open ? null : fecha.round)}
            >
              <span className={styles.fecha}>{fecha.fecha ? `Fecha ${fecha.fecha}` : 'Fecha'}</span>
              <span className={styles.trophy} aria-hidden="true"><TrophyIcon /></span>
              <span className={styles.winner}>{fecha.winners.join(', ')}</span>
              <span className={styles.points}>{fecha.points} pts</span>
              <span className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} aria-hidden="true">
                <ChevronIcon />
              </span>
            </button>

            {open && (
              <div id={panelId} className={styles.details}>
                <div className={styles.detailsHeader}>
                  <div>
                    <strong>Tabla final de la fecha</strong>
                    <span>Puntos y resultados exactos</span>
                  </div>
                  <FechaExport title={title} fecha={fecha} />
                </div>
                <StandingsTable standings={fecha.standings} winners={fecha.winners} />
              </div>
            )}
          </article>
        )
      })}
    </div>
  )
}

function StandingsTable({ standings, winners }: { standings: FechaStanding[]; winners: string[] }) {
  return (
    <div className={styles.table} role="table" aria-label="Posiciones de la fecha">
      <div className={`${styles.tableRow} ${styles.tableHead}`} role="row">
        <span role="columnheader">Pos.</span>
        <span role="columnheader">Jugador</span>
        <span role="columnheader" aria-label="Resultados exactos">Ex.</span>
        <span role="columnheader" aria-label="Puntos">Pts.</span>
      </div>
      {standings.map((row, index) => {
        const position = getPosition(standings, index)
        const winner = winners.includes(row.name)
        return (
          <div key={row.userId} className={`${styles.tableRow} ${winner ? styles.winnerRow : ''}`} role="row">
            <span className={styles.position} role="cell">{position}°</span>
            <span className={styles.player} role="cell">
              {row.name}
              {winner && <span className={styles.winnerLabel}>Ganador</span>}
            </span>
            <span className={styles.exacts} role="cell">{row.exacts}</span>
            <strong className={styles.score} role="cell">{row.points}</strong>
          </div>
        )
      })}
    </div>
  )
}

function FechaExport({ title, fecha }: { title: string; fecha: FechaWinner }) {
  const exportRef = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function exportJpg() {
    if (busy) return
    const exportNode = exportRef.current
    if (!exportNode) {
      setMessage('No se pudo preparar la imagen. Probá otra vez.')
      return
    }
    setBusy(true)
    setMessage(null)
    try {
      const canvas = await html2canvas(exportNode, {
        backgroundColor: '#070d1a',
        scale: 1,
        width: 1080,
        windowWidth: 1080,
        useCORS: true,
        logging: false,
      })
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((value) => value ? resolve(value) : reject(new Error('No se pudo crear el JPG')), 'image/jpeg', 0.94)
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const fechaLabel = fecha.fecha ? `fecha-${fecha.fecha}` : 'fecha'
      link.href = url
      link.download = `prode-${fechaLabel}-${slugify(title)}.jpg`
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      setMessage('JPG descargado')
    } catch (error) {
      console.error(error)
      setMessage('No se pudo generar. Probá otra vez.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className={styles.exportAction}>
        <button type="button" className="btn-primary" onClick={exportJpg} disabled={busy}>
          <CameraIcon />
          {busy ? 'Generando…' : 'Exportar JPG'}
        </button>
        {message && <span className={styles.status} role="status">{message}</span>}
      </div>
      <ExportCard ref={exportRef} title={title} fecha={fecha} />
    </>
  )
}

const ExportCard = forwardRef<HTMLDivElement, { title: string; fecha: FechaWinner }>(function ExportCard(
  { title, fecha },
  ref,
) {
  const fechaTitle = fecha.fecha ? `FECHA ${fecha.fecha}` : 'FECHA'
  return (
    <div ref={ref} className={styles.exportCard}>
      <div className={styles.exportGlow} />
      <header className={styles.exportHeader}>
        <div className={styles.exportBrand}><BallIcon /> PRODE ARGENTINO</div>
        <div className={styles.exportBadge}>TABLA FINAL</div>
      </header>
      <div className={styles.exportTitle}>{fechaTitle}</div>
      <div className={styles.exportTournament}>{title}</div>

      <section className={styles.exportHero}>
        <div className={styles.exportTrophy}><TrophyIcon /></div>
        <div>
          <div className={styles.exportEyebrow}>{fecha.winners.length > 1 ? 'GANADORES' : 'GANADOR'}</div>
          <div className={styles.exportWinner}>{fecha.winners.join(' · ')}</div>
          <div className={styles.exportWinnerPoints}>{fecha.points} PUNTOS</div>
        </div>
      </section>

      <div className={styles.exportTable}>
        <div className={`${styles.exportRow} ${styles.exportTableHead}`}>
          <span>POS.</span><span>JUGADOR</span><span>EXACTOS</span><span>PTS.</span>
        </div>
        {fecha.standings.map((row, index) => {
          const winner = fecha.winners.includes(row.name)
          return (
            <div key={row.userId} className={`${styles.exportRow} ${winner ? styles.exportWinnerRow : ''}`}>
              <span className={styles.exportPosition}>{getPosition(fecha.standings, index)}°</span>
              <span className={styles.exportPlayer}>{row.name}</span>
              <span>{row.exacts}</span>
              <strong>{row.points}</strong>
            </div>
          )
        })}
      </div>

      <footer className={styles.exportFooter}>
        <span>prode-argentino.vercel.app</span>
        <span>Pronosticá · Sumá · Ganá</span>
      </footer>
    </div>
  )
})

function getPosition(standings: FechaStanding[], index: number) {
  if (index === 0) return 1
  const row = standings[index]
  const previous = standings[index - 1]
  if (row.points === previous.points && row.exacts === previous.exacts) return getPosition(standings, index - 1)
  return index + 1
}

function slugify(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'torneo'
}

function Icon({ children, className, viewBox = '0 0 24 24' }: { children: ReactNode; className?: string; viewBox?: string }) {
  return <svg className={className} viewBox={viewBox} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">{children}</svg>
}

function TrophyIcon() {
  return <Icon><path d="M8 4h8v3.5c0 3.3-1.8 5.5-4 5.5s-4-2.2-4-5.5V4Z" stroke="currentColor" strokeWidth="1.8"/><path d="M8 6H5v1.3C5 9.5 6.3 11 8.7 11M16 6h3v1.3c0 2.2-1.3 3.7-3.7 3.7M12 13v3m-3 4h6m-5-4h4v4h-4v-4Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></Icon>
}

function ChevronIcon() {
  return <Icon><path d="m7 10 5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></Icon>
}

function CameraIcon() {
  return <Icon><path d="M4 7.5h3l1.3-2h7.4l1.3 2h3v11H4v-11Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><circle cx="12" cy="13" r="3.2" stroke="currentColor" strokeWidth="1.8"/></Icon>
}

function BallIcon() {
  return <Icon><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7"/><path d="m12 8 3 2.2-1.1 3.5h-3.8L9 10.2 12 8Zm0-5v5m8.6 1.2L15 10.3m2.2 8.6-3.3-5.2m-7.1 5.2 3.3-5.2M3.4 9.2 9 10.3" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></Icon>
}
