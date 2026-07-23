'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Refresca los datos del servidor (marcadores, estados) sin recargar la página
 * entera. Se activa solo cuando hay algún partido en vivo, para no gastar
 * recursos de más.
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
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs, router]);

  return null;
}
