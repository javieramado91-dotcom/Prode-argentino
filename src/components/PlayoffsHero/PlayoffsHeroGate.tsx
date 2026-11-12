'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { IconBracket, IconChevron } from '@/components/Icons/Icons'
import styles from './PlayoffsHero.module.css'

import { HERO_COOKIE } from './heroCookie'

// La cookie la lee el servidor para no pintar el cartel y esconderlo después
// (sin parpadeo).
const HIDE_FOR_SECONDS = 12 * 60 * 60 // 12 horas

/**
 * Envuelve el cartel de Playoffs: se cierra con la cruz, con "Saltar" o solo,
 * cuando se consume la línea de tiempo. Cerrado, queda una barrita finita para
 * volver a abrirlo. La línea se pausa con el mouse encima o con foco adentro.
 */
export default function PlayoffsHeroGate({
  children,
  initialHidden,
  durationMs = 12000,
}: {
  children: ReactNode
  initialHidden: boolean
  durationMs?: number
}) {
  const [hidden, setHidden] = useState(initialHidden)
  const [auto, setAuto] = useState(false)
  const [run, setRun] = useState(0) // reinicia la línea al reabrir
  const [paused, setPaused] = useState(false)
  // Tiempo que falta. El temporizador manda (el evento de fin de animación no
  // es confiable en todos los navegadores); la línea es solo lo visual.
  const remaining = useRef(durationMs)

  useEffect(() => {
    // Con "reducir movimiento" no hay cuenta regresiva: se cierra a mano.
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAuto(!reduce)
  }, [])

  useEffect(() => {
    if (hidden || !auto || paused) return
    const startedAt = Date.now()
    const id = window.setTimeout(close, remaining.current)
    return () => {
      window.clearTimeout(id)
      remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt))
    }
  }, [hidden, auto, paused, run])

  function close() {
    try {
      document.cookie = `${HERO_COOKIE}=hidden; max-age=${HIDE_FOR_SECONDS}; path=/; samesite=lax`
    } catch {
      /* sin cookies: solo se cierra en esta visita */
    }
    setHidden(true)
  }

  function reopen() {
    remaining.current = durationMs
    setPaused(false)
    setRun((n) => n + 1)
    setHidden(false)
  }

  if (hidden) {
    return (
      <button type="button" className={styles.collapsed} onClick={reopen} aria-expanded={false}>
        <span className={styles.collapsedIcon} aria-hidden="true"><IconBracket size={16} /></span>
        <span className={styles.collapsedTitle}>Playoffs</span>
        <span className={styles.collapsedText}>Desde octavos hasta la final · ver cómo se juega</span>
        <span className={styles.collapsedChevron} aria-hidden="true"><IconChevron size={16} /></span>
      </button>
    )
  }

  return (
    <div
      className={styles.gate}
      onMouseEnter={() => { if (window.matchMedia('(hover: hover)').matches) setPaused(true) }}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false) }}
    >
      {children}
      <div className={styles.gateActions}>
        <button type="button" className={styles.skip} onClick={close}>
          Saltar
          <IconChevron size={15} style={{ transform: 'rotate(-90deg)' }} />
        </button>
        <button type="button" className={styles.closeBtn} onClick={close} aria-label="Cerrar el cartel de Playoffs" title="Cerrar">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
      {auto && (
        <div className={styles.timer} aria-hidden="true">
          <span
            key={run}
            className={styles.timerBar}
            style={{ animationDuration: `${durationMs}ms`, animationPlayState: paused ? 'paused' : 'running' }}
          />
        </div>
      )}
    </div>
  )
}
