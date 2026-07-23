'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Mientras haya partidos en vivo, re-sincroniza con ESPN y refresca los datos
 * (marcadores y estados) cada cierto tiempo, sin recargar la página entera.
 * El endpoint tiene throttle, así que llamarlo seguido es barato.
 */
export default function LiveRefresher({
  active,
  intervalMs = 30000,
}: {
  active: boolean;
  intervalMs?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;
    const id = setInterval(async () => {
      try {
        await fetch('/api/sync-matches', { method: 'POST' });
      } catch {
        /* si falla el sync, igual refrescamos lo que haya */
      }
      router.refresh();
    }, intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs, router]);

  return null;
}
