'use client'

import { useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import type { FechaWinner, Award } from '@/lib/awards'
import AwardsStoryCard from './AwardsStoryCard'

// Botón "Compartir en Insta" + placa 9:16 (1080×1920) para stories.
// La placa se monta fuera de pantalla y se captura con html2canvas.
export default function AwardsShare({
  title,
  fechaWinners,
  awards,
}: {
  title: string
  fechaWinners: FechaWinner[]
  awards: Award[]
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false)

  if (fechaWinners.length === 0) return null

  async function share() {
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
      const image = canvas.toDataURL('image/jpeg', 0.92)
      const link = document.createElement('a')
      link.href = image
      link.download = `prode-premios-${new Date().toISOString().slice(0, 10)}.jpg`
      link.click()
    } catch (e) {
      console.error(e)
      alert('No se pudo generar la imagen. Probá de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button onClick={share} disabled={busy} className="btn-primary" style={{ fontSize: '0.85rem' }}>
        {busy ? 'Generando…' : '📸 Compartir en Insta'}
      </button>

      <AwardsStoryCard
        ref={ref}
        title={title}
        fechaWinners={fechaWinners}
        awards={awards}
        style={{ position: 'fixed', left: -20000, top: 0 }}
      />
    </>
  )
}
