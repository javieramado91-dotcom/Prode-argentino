import React from 'react';

/**
 * Marca del Prode: pelota facetada con el Sol de Mayo en el centro.
 * Usa `currentColor`, así hereda el color del contenedor y queda bien en
 * fondo oscuro. `size` en px.
 */
export function LogoMark({ size = 40, className, style }: { size?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      style={style}
      role="img"
      aria-label="Prode Fútbol Argentino"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Pelota */}
      <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="2.5" opacity="0.9" />
      {/* Pentágono central */}
      <path
        d="M50,30 L69,43.8 L61.8,66.2 L38.2,66.2 L31,43.8 Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        opacity="0.75"
      />
      {/* Costuras hacia el borde */}
      <g stroke="currentColor" strokeWidth="2" opacity="0.55" strokeLinecap="round">
        <line x1="50" y1="30" x2="50" y2="6" />
        <line x1="69" y1="43.8" x2="91.8" y2="36.4" />
        <line x1="61.8" y1="66.2" x2="75.9" y2="85.6" />
        <line x1="38.2" y1="66.2" x2="24.1" y2="85.6" />
        <line x1="31" y1="43.8" x2="8.2" y2="36.4" />
      </g>
      {/* Sol de Mayo: rayos */}
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="56" y1="50" x2="62" y2="50" />
        <line x1="55.2" y1="53" x2="60.4" y2="56" />
        <line x1="53" y1="55.2" x2="56" y2="60.4" />
        <line x1="50" y1="56" x2="50" y2="62" />
        <line x1="47" y1="55.2" x2="44" y2="60.4" />
        <line x1="44.8" y1="53" x2="39.6" y2="56" />
        <line x1="44" y1="50" x2="38" y2="50" />
        <line x1="44.8" y1="47" x2="39.6" y2="44" />
        <line x1="47" y1="44.8" x2="44" y2="39.6" />
        <line x1="50" y1="44" x2="50" y2="38" />
        <line x1="53" y1="44.8" x2="56" y2="39.6" />
        <line x1="55.2" y1="47" x2="60.4" y2="44" />
      </g>
      {/* Cara del sol */}
      <circle cx="50" cy="50" r="4.5" fill="currentColor" />
    </svg>
  );
}

/**
 * Lockup horizontal: marca + texto "PRODE / Fútbol Argentino".
 */
export function Logo({ size = 44, subtitle = 'Fútbol Argentino' }: { size?: number; subtitle?: string }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem' }}>
      <LogoMark size={size} style={{ color: 'var(--color-accent)' }} />
      <div style={{ lineHeight: 1 }}>
        <div className="gradient-text" style={{ fontSize: size * 0.6, fontWeight: 800, letterSpacing: '0.08em' }}>
          PRODE
        </div>
        <div style={{ fontSize: size * 0.26, color: 'var(--color-text-muted)', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 2 }}>
          {subtitle}
        </div>
      </div>
    </div>
  );
}

export default Logo;
