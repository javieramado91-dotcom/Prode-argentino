'use client';

import React, { useState } from 'react';

/**
 * Firma del autor, presente al pie de todas las páginas.
 * Al tocarla muestra nombre y correo de contacto.
 */
export default function Signature() {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: 'relative', textAlign: 'center', padding: '2.5rem 1rem 1.5rem' }}>
      {open && (
        <div
          className="glass-panel"
          style={{
            position: 'absolute',
            bottom: '3.6rem',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '0.8rem 1.2rem',
            whiteSpace: 'nowrap',
            fontSize: '0.85rem',
            zIndex: 50,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 2 }}>Javier Amado</div>
          <a
            href="mailto:javieramado91@gmail.com"
            style={{ color: 'var(--color-accent)', fontSize: '0.8rem' }}
          >
            javieramado91@gmail.com
          </a>
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: '0.78rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--color-text-muted)',
          opacity: 0.75,
          transition: 'opacity 0.2s',
        }}
      >
        By <span className="gradient-text" style={{ fontWeight: 800 }}>JA</span>
      </button>
    </div>
  );
}
