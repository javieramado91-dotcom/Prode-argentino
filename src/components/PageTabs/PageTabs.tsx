'use client'

import { useState, type ReactNode } from 'react'

export type PageTab = {
  key: string
  label: string
  icon?: ReactNode
  content: ReactNode
  gold?: boolean
}

// Pestañas segmentadas genéricas. El contenido de cada pestaña llega ya
// renderizado (puede venir de un server component).
export default function PageTabs({
  tabs,
  initial,
  sticky = false,
}: {
  tabs: PageTab[]
  initial?: string
  sticky?: boolean
}) {
  const [active, setActive] = useState(initial ?? tabs[0]?.key)
  return (
    <div>
      <div
        role="tablist"
        className="segmented"
        style={{
          marginBottom: '1.25rem',
          ...(sticky
            ? { position: 'sticky', top: 'calc(var(--appbar-h) + 8px)', zIndex: 20, boxShadow: '0 10px 24px -14px rgba(0,0,0,0.8)', background: 'rgba(6,12,24,0.92)' }
            : {}),
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            type="button"
            aria-selected={active === t.key}
            className={t.gold ? 'gold' : undefined}
            onClick={() => setActive(t.key)}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.key} role="tabpanel" hidden={active !== t.key}>
          {t.content}
        </div>
      ))}
    </div>
  )
}
