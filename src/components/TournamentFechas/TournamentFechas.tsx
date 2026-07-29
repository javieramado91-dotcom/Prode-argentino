'use client'

import { useRef, useState, forwardRef } from 'react'
import html2canvas from 'html2canvas'
import { getGroupMatchPredictions, type GroupPrediction } from '@/app/grupos/actions'

export type FechaMatch = {
  id: string
  home: string
  away: string
  homeLogo?: string | null
  awayLogo?: string | null
  date: string
  status: 'pending' | 'in_progress' | 'finished'
  homeScore?: number | null
  awayScore?: number | null
}

export type ActiveFecha = {
  round: string
  fecha: number | null
  standings: { name: string; points: number; exacts?: number }[]
  matches: FechaMatch[]
}

export default function TournamentFechas({
  groupId,
  groupName,
  fechas,
}: {
  groupId: string
  groupName: string
  fechas: ActiveFecha[]
}) {
  if (fechas.length === 0) {
    return (
      <section className="glass-panel" style={{ padding: '1.5rem', marginTop: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        No hay fechas en juego en este momento. Cuando arranque una fecha vas a ver acá la
        tabla de puntos de esa fecha y los pronósticos de tus rivales. ⚽
      </section>
    )
  }

  return (
    <div style={{ marginTop: '2rem' }}>
      <h3 style={{ margin: '0 0 0.9rem', fontSize: '1.15rem' }}>🎯 Fechas en juego</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {fechas.map((f) => (
          <FechaBlock key={f.round} groupId={groupId} groupName={groupName} fecha={f} />
        ))}
      </div>
    </div>
  )
}

function FechaBlock({ groupId, groupName, fecha }: { groupId: string; groupName: string; fecha: ActiveFecha }) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false)

  const live = fecha.matches.some((m) => m.status === 'in_progress')
  const label = live ? 'EN VIVO' : 'PROVISORIO'
  const playedCount = fecha.matches.filter((m) => m.status === 'finished').length
  const fechaTitle = fecha.fecha ? `Fecha ${fecha.fecha}` : 'Fecha'

  async function exportImage() {
    if (!cardRef.current) return
    setBusy(true)
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#070d1a',
        scale: 2,
        useCORS: true,
        logging: false,
      })
      const image = canvas.toDataURL('image/jpeg', 0.92)
      const link = document.createElement('a')
      link.href = image
      link.download = `prode-${fechaTitle.replace(/\s/g, '')}-${new Date().toISOString().slice(0, 10)}.jpg`
      link.click()
    } catch (e) {
      console.error(e)
      alert('No se pudo generar la imagen.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="glass-panel" style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.9rem' }}>
        <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{fechaTitle}</h4>
        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: 800,
            letterSpacing: 0.5,
            padding: '0.18rem 0.55rem',
            borderRadius: 999,
            color: live ? '#fff' : 'var(--color-warning)',
            background: live ? 'var(--color-danger)' : 'rgba(251,191,36,0.14)',
          }}
        >
          {label}
        </span>
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
          {playedCount}/{fecha.matches.length} jugados
        </span>
        <button className="btn-ghost" onClick={exportImage} disabled={busy} style={{ marginLeft: 'auto', fontSize: '0.8rem' }}>
          {busy ? 'Generando…' : '📸 Exportar tabla'}
        </button>
      </div>

      {/* Mini-tabla en pantalla */}
      <MiniTable standings={fecha.standings} />

      {/* Partidos de la fecha con pronósticos del torneo */}
      <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {fecha.matches.map((m) => (
          <MatchRow key={m.id} groupId={groupId} match={m} />
        ))}
      </div>

      {/* Placa exportable (fuera de pantalla) */}
      <ExportCard ref={cardRef} groupName={groupName} fechaTitle={fechaTitle} label={label} playedCount={playedCount} total={fecha.matches.length} standings={fecha.standings} />
    </section>
  )
}

function MiniTable({ standings }: { standings: { name: string; points: number }[] }) {
  if (standings.length === 0) {
    return <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Todavía no hay puntos en esta fecha.</div>
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
      {standings.map((r, i) => (
        <div
          key={r.name + i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.5rem 0.75rem',
            borderRadius: 10,
            background: i === 0 ? 'rgba(56,189,248,0.10)' : 'rgba(255,255,255,0.03)',
          }}
        >
          <span style={{ width: 26, textAlign: 'center', fontWeight: 800, color: 'var(--color-text-muted)' }}>
            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`}
          </span>
          <span style={{ flex: 1, fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
          <span style={{ fontWeight: 800, color: 'var(--color-accent)' }}>{r.points} pts</span>
        </div>
      ))}
    </div>
  )
}

function MatchRow({ groupId, match }: { groupId: string; match: FechaMatch }) {
  const [open, setOpen] = useState(false)
  const [preds, setPreds] = useState<GroupPrediction[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const started = match.status !== 'pending' || new Date(match.date).getTime() <= Date.now()

  async function toggle() {
    const next = !open
    setOpen(next)
    if (next && preds === null && started) {
      try {
        setPreds(await getGroupMatchPredictions(groupId, match.id))
      } catch (e: any) {
        setError(e?.message || 'Error al cargar.')
      }
    }
  }

  const scoreLabel =
    match.status === 'pending'
      ? new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(match.date))
      : `${match.homeScore ?? '-'} - ${match.awayScore ?? '-'}`

  return (
    <div style={{ borderRadius: 12, background: 'rgba(255,255,255,0.03)', padding: '0.6rem 0.8rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: 600, minWidth: 0 }}>
          {match.home} <span style={{ color: 'var(--color-text-muted)', fontWeight: 800 }}>{match.status === 'pending' ? 'vs' : scoreLabel}</span> {match.away}
        </span>
        {match.status !== 'pending' && (
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: match.status === 'in_progress' ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
            {match.status === 'in_progress' ? 'EN VIVO' : 'FIN'}
          </span>
        )}
      </div>
      {match.status === 'pending' && (
        <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginTop: 2 }}>{scoreLabel}</div>
      )}

      {started ? (
        <button
          onClick={toggle}
          className="btn-ghost"
          style={{ marginTop: '0.5rem', fontSize: '0.78rem', padding: '0.3rem 0.6rem' }}
        >
          {open ? 'Ocultar pronósticos' : 'Ver pronósticos del torneo'}
        </button>
      ) : (
        <div style={{ marginTop: '0.4rem', fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
          🔒 Los pronósticos se ven cuando empiece el partido.
        </div>
      )}

      {open && started && (
        <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {error && <div style={{ color: 'var(--color-warning)', fontSize: '0.8rem' }}>{error}</div>}
          {preds === null && !error && <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>Cargando…</div>}
          {preds !== null && preds.length === 0 && !error && (
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>Nadie del torneo pronosticó este partido.</div>
          )}
          {(preds || []).map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.84rem' }}>
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.display_name}</span>
              <span style={{ fontWeight: 700 }}>{p.predicted_home_score} - {p.predicted_away_score}</span>
              {match.status === 'finished' && p.points_earned != null && (
                <span style={{ fontWeight: 800, color: 'var(--color-accent)', minWidth: 34, textAlign: 'right' }}>+{p.points_earned}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Placa exportable (fuera de pantalla): tabla de la fecha con la marca del Prode.
const ExportCard = forwardRef<
  HTMLDivElement,
  { groupName: string; fechaTitle: string; label: string; playedCount: number; total: number; standings: { name: string; points: number }[] }
>(function ExportCard({ groupName, fechaTitle, label, playedCount, total, standings }, ref) {
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: 2 }}>⚽ PRODE ARGENTINO</span>
        <span style={{ fontSize: 22, fontWeight: 800, color: label === 'EN VIVO' ? '#f87171' : '#fbbf24', letterSpacing: 1 }}>{label}</span>
      </div>
      <div style={{ fontSize: 66, fontWeight: 900, lineHeight: 1, color: '#38bdf8' }}>{fechaTitle}</div>
      <div style={{ fontSize: 30, color: '#8b9bb4', fontWeight: 600, margin: '6px 0 6px' }}>{groupName}</div>
      <div style={{ fontSize: 24, color: '#8b9bb4', marginBottom: 28 }}>{playedCount}/{total} partidos jugados</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {standings.length === 0 && <div style={{ fontSize: 28, color: '#8b9bb4' }}>Todavía no hay puntos.</div>}
        {standings.map((r, i) => (
          <div
            key={r.name + i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 24,
              padding: '20px 28px',
              borderRadius: 20,
              background: i === 0 ? 'rgba(56,189,248,0.14)' : 'rgba(255,255,255,0.04)',
              border: i === 0 ? '2px solid rgba(56,189,248,0.35)' : '2px solid rgba(255,255,255,0.05)',
            }}
          >
            <span style={{ width: 60, fontSize: 34, fontWeight: 900, textAlign: 'center' }}>
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`}
            </span>
            <span style={{ flex: 1, fontSize: 40, fontWeight: 800, minWidth: 0 }}>{r.name}</span>
            <span style={{ fontSize: 40, fontWeight: 900, color: '#fbbf24' }}>{r.points} pts</span>
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center', marginTop: 40, fontSize: 26, fontWeight: 700, color: '#38bdf8' }}>
        prode-argentino.vercel.app
      </div>
    </div>
  )
})
