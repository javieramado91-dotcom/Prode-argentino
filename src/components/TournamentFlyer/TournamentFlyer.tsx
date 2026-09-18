'use client'

import { useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import FlyerStoryCard, { type FlyerData } from './FlyerStoryCard'
import { diaLargo, hora24 } from '@/lib/fecha'

// Botón "Flyer de la fecha" + placa 9:16 (1080×1920) para stories/estados.
// Mismo patrón que AwardsShare: la placa se monta fuera de pantalla y se
// captura con html2canvas.
export default function TournamentFlyer({ data }: { data: FlyerData | null }) {
  const ref = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false)

  if (!data) {
    return (
      <section
        className="glass-panel"
        style={{ padding: '1.25rem', marginTop: '2rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}
      >
        📣 Cuando haya una fecha por jugar vas a poder generar acá el flyer para promocionarla.
      </section>
    )
  }

  const destacado = data.matches.find((m) => m.featured) ?? null
  const fileName = `prode-${data.fechaLabel.toLowerCase().replace(/\s+/g, '')}-${slug(data.groupName)}.jpg`

  async function generar() {
    if (!ref.current) return
    setBusy(true)
    try {
      const canvas = await html2canvas(ref.current, {
        backgroundColor: '#070d1a',
        scale: 1,
        width: 1080,
        height: 1920,
        windowWidth: 1080,
        windowHeight: 1920,
        useCORS: true,
        logging: false,
      })
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.92))
      if (!blob) throw new Error('canvas vacío')

      // En el celular conviene el menú de compartir (va derecho a Instagram o
      // WhatsApp). En la compu no existe: ahí se descarga el archivo.
      const file = new File([blob], fileName, { type: 'image/jpeg' })
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file] })
          return
        } catch (e) {
          // Cancelar el menú de compartir no es un error: no descargamos nada.
          if (e instanceof DOMException && e.name === 'AbortError') return
        }
      }

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      link.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
      alert('No se pudo generar el flyer. Probá de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="glass-panel" style={{ padding: '1.25rem', marginTop: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.15rem' }}>📣 Promocioná la fecha</h3>
        <button onClick={generar} disabled={busy} className="btn-primary" style={{ marginLeft: 'auto', fontSize: '0.85rem' }}>
          {busy ? 'Generando…' : '🖼️ Flyer 9:16'}
        </button>
      </div>

      <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        <div>
          <strong style={{ color: 'var(--color-accent)' }}>{data.fechaLabel}</strong>
          {' · '}
          {data.matches.length} {data.matches.length === 1 ? 'partido' : 'partidos'}
          {' · '}
          {data.started ? 'sigue' : 'arranca'} el {diaLargo(data.kickoff)} a las {hora24(data.kickoff)}
        </div>
        {destacado ? (
          <div>
            ⭐ Vale doble: <strong style={{ color: 'var(--color-warning)' }}>{destacado.home} vs {destacado.away}</strong>
          </div>
        ) : (
          <div>⭐ Todavía no hay Partido de la Fecha elegido.</div>
        )}
        <div>
          🏆 Último ganador:{' '}
          {data.lastWinner
            ? `${data.lastWinner.names.join(', ')} (${data.lastWinner.fechaLabel}, ${data.lastWinner.points} pts)`
            : 'todavía ninguno'}
        </div>
      </div>

      {/* Placa (fuera de pantalla) */}
      <FlyerStoryCard ref={ref} data={data} style={{ position: 'fixed', left: -20000, top: 0 }} />
    </section>
  )
}

function slug(s: string): string {
  return (
    s
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'torneo'
  )
}
