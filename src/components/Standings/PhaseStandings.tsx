'use client'

import { useRef, useState, type ReactNode } from 'react'
import type { Standing } from '@/lib/phases'
import { downloadNodeAsJpg, slugify } from '@/lib/exportImage'
import { IconCamera } from '@/components/Icons/Icons'
import StandingsTable, { Podium } from './StandingsTable'
import StandingsStory from './StandingsStory'

// Tabla de una fase (Playoffs, General…) con podio y placa 9:16 para compartir.
export default function PhaseStandings({
  title,
  icon,
  subtitle,
  rows,
  meId,
  storyBadge,
  storyTitle,
  storyContext,
  footnote,
  emptyText,
  showPodium = true,
}: {
  title: string
  icon?: ReactNode
  subtitle?: ReactNode
  rows: Standing[]
  meId?: string
  storyBadge: string
  storyTitle: string
  storyContext: string
  footnote?: string
  emptyText?: string
  showPodium?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false)

  async function share() {
    if (!ref.current) return
    setBusy(true)
    try {
      await downloadNodeAsJpg(ref.current, `prode-${slugify(storyBadge)}-${slugify(storyContext)}.jpg`, { width: 1080, height: 1920 })
    } catch (e) {
      console.error(e)
      alert('No se pudo generar la imagen. Probá de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="glass-panel panel-pad" style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        <div style={{ minWidth: 0 }}>
          <h2 className="section-title" style={{ marginBottom: subtitle ? '0.3rem' : 0 }}>
            {icon && <span className="icon" style={{ display: 'inline-flex' }}>{icon}</span>}
            {title}
          </h2>
          {subtitle && <div className="muted" style={{ fontSize: '0.88rem' }}>{subtitle}</div>}
        </div>
        <button type="button" className="btn-ghost btn-sm" onClick={share} disabled={busy || rows.length === 0}>
          <IconCamera />
          {busy ? 'Generando…' : 'Compartir'}
        </button>
      </div>

      {showPodium && <Podium rows={rows} />}
      <StandingsTable rows={rows} meId={meId} emptyText={emptyText} caption={title} />
      {footnote && <p className="muted" style={{ fontSize: '0.78rem', marginTop: '0.65rem' }}>{footnote}</p>}

      <StandingsStory
        ref={ref}
        badge={storyBadge}
        title={storyTitle}
        context={storyContext}
        rows={rows}
        footnote={footnote}
        style={{ position: 'fixed', left: -20000, top: 0 }}
      />
    </section>
  )
}
