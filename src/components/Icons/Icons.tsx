import type { ReactNode, SVGProps } from 'react'

// Íconos SVG de trazo (misma familia visual en toda la app, 24×24, stroke 1.8).
type P = SVGProps<SVGSVGElement> & { size?: number }

function Svg({ size = 20, children, ...rest }: P & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  )
}

export const IconHome = (p: P) => (
  <Svg {...p}><path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1v-8.5Z" /></Svg>
)
export const IconTrophy = (p: P) => (
  <Svg {...p}>
    <path d="M8 4h8v4.5c0 3-1.8 5-4 5s-4-2-4-5V4Z" />
    <path d="M8 6H5v1.2C5 9.4 6.3 11 8.6 11M16 6h3v1.2c0 2.2-1.3 3.8-3.6 3.8M12 13.5V17m-3.5 3h7m-5.5-3h4l.5 3h-5l.5-3Z" />
  </Svg>
)
export const IconUser = (p: P) => (
  <Svg {...p}><circle cx="12" cy="8.5" r="3.6" /><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" /></Svg>
)
export const IconUsers = (p: P) => (
  <Svg {...p}><circle cx="9" cy="9" r="3.2" /><path d="M3.5 19c.6-3 2.8-4.6 5.5-4.6s4.9 1.6 5.5 4.6" /><path d="M15.5 6.2a3 3 0 0 1 0 5.6M17.5 14.6c1.6.6 2.7 2 3 4.4" /></Svg>
)
export const IconCrown = (p: P) => (
  <Svg {...p}><path d="m4 8 4 3.5L12 5l4 6.5L20 8l-1.6 10H5.6L4 8Z" /><path d="M6 21h12" /></Svg>
)
export const IconLogout = (p: P) => (
  <Svg {...p}><path d="M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4" /><path d="M10 16.5 5.5 12 10 7.5M5.5 12H15" /></Svg>
)
export const IconBall = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m12 7.5 3.3 2.4-1.2 3.9H9.9L8.7 9.9 12 7.5Z" />
    <path d="M12 3v4.5m8.4 1.3-5.1 1.1m2.7 8.6-3.9-4.7M6 18.5l3.9-4.7M3.6 8.8l5.1 1.1" />
  </Svg>
)
export const IconCalendar = (p: P) => (
  <Svg {...p}><rect x="4" y="5" width="16" height="15" rx="2.5" /><path d="M8 3v4M16 3v4M4 10h16" /></Svg>
)
export const IconTarget = (p: P) => (
  <Svg {...p}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.8" /><circle cx="12" cy="12" r="1.3" fill="currentColor" /></Svg>
)
export const IconBracket = (p: P) => (
  <Svg {...p}><path d="M3 5h4v5H3M3 14h4v5H3M7 7.5h3v9H7M10 12h4M17 9h4v6h-4M14 12h3" /></Svg>
)
export const IconTable = (p: P) => (
  <Svg {...p}><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><path d="M3.5 9.5h17M3.5 14.5h17M9 4.5v15" /></Svg>
)
export const IconMedal = (p: P) => (
  <Svg {...p}><path d="M8 3h3l1 4.5M16 3h-3l-1 4.5" /><circle cx="12" cy="14.5" r="5.5" /><path d="m12 11.8.9 1.8 2 .3-1.4 1.4.3 2-1.8-1-1.8 1 .3-2-1.4-1.4 2-.3.9-1.8Z" /></Svg>
)
export const IconFire = (p: P) => (
  <Svg {...p}><path d="M12 21c3.9 0 6.5-2.6 6.5-6.3 0-3.4-2.4-5.7-3.6-7.8-.4 1.7-1.2 2.8-2.4 3.3.2-3.2-1.2-5.8-3.5-7.2.1 3.4-1.6 5.6-3 7.5-1 1.3-1.5 2.7-1.5 4.2C4.5 18.4 7.6 21 12 21Z" /></Svg>
)
export const IconCamera = (p: P) => (
  <Svg {...p}><path d="M4 7.5h3l1.3-2h7.4l1.3 2h3v11H4v-11Z" /><circle cx="12" cy="13" r="3.2" /></Svg>
)
export const IconChevron = (p: P) => (
  <Svg {...p}><path d="m7 10 5 5 5-5" /></Svg>
)
export const IconArrowRight = (p: P) => (
  <Svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Svg>
)
export const IconLock = (p: P) => (
  <Svg {...p}><rect x="5" y="10.5" width="14" height="9.5" rx="2" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></Svg>
)
export const IconStar = (p: P) => (
  <Svg {...p}><path d="m12 3.8 2.5 5.1 5.6.8-4 3.9.9 5.6-5-2.6-5 2.6.9-5.6-4-3.9 5.6-.8L12 3.8Z" /></Svg>
)
export const IconArchive = (p: P) => (
  <Svg {...p}><rect x="3.5" y="4.5" width="17" height="4.5" rx="1.2" /><path d="M5 9v9.5a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5V9M10 13h4" /></Svg>
)
export const IconWhatsapp = (p: P) => (
  <Svg {...p}><path d="M4.5 19.5 5.6 16A7.8 7.8 0 1 1 8.4 18.6l-3.9.9Z" /><path d="M9.3 8.6c.2-.4.5-.4.8-.4l.6 1.4c.1.2 0 .4-.1.6l-.5.6c.6 1.2 1.6 2.1 2.8 2.7l.6-.6c.2-.2.4-.2.6-.1l1.4.7c0 .4-.1.8-.5 1.1-.5.4-1.3.6-2.1.3a8 8 0 0 1-4.3-4.3c-.2-.8 0-1.5.4-2Z" /></Svg>
)
export const IconPlus = (p: P) => (
  <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>
)
export const IconCheck = (p: P) => (
  <Svg {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Svg>
)
export const IconWhistle = (p: P) => (
  <Svg {...p}><circle cx="9" cy="14" r="5" /><path d="M13 10.5 20 7v3.5l-5.4 2.2M4 6l2.5 2.5M9 4v3" /></Svg>
)
export const IconChart = (p: P) => (
  <Svg {...p}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></Svg>
)
