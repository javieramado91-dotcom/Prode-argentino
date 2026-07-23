'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Dispara la sincronización de partidos apenas se monta (al iniciar sesión o
 * refrescar). El servidor tiene throttle, así que llamarlo seguido es barato.
 * Solo refresca la vista si realmente hubo cambios.
 */
export default function AutoSync() {
  const router = useRouter();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    fetch('/api/sync-matches', { method: 'POST' })
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok) router.refresh();
      })
      .catch(() => {});
  }, [router]);

  return null;
}
