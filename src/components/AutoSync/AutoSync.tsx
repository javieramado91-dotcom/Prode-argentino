'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Sincroniza los partidos automáticamente apenas se monta la página (al iniciar
 * sesión o refrescar). El servidor tiene throttle, así que es barato.
 * Si la sincronización falla por un problema de configuración (p. ej. falta
 * ejecutar la migración SQL), muestra un aviso claro en lugar de fallar mudo.
 */
export default function AutoSync() {
  const router = useRouter();
  const done = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    fetch('/api/sync-matches', { method: 'POST' })
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok) {
          setError(null);
          router.refresh();
        } else if (d?.error) {
          setError(d.error);
        }
      })
      .catch(() => {});
  }, [router]);

  if (!error) return null;

  return (
    <div
      className="glass-panel"
      style={{
        padding: '0.9rem 1.1rem',
        marginBottom: '1.25rem',
        borderColor: 'var(--color-warning)',
        color: 'var(--color-warning)',
        fontSize: '0.9rem',
        lineHeight: 1.5,
      }}
    >
      ⚠️ {error}
    </div>
  );
}
