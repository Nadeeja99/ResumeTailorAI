import { useEffect, useState } from 'react';

/** Milliseconds since `startedAt`, re-rendering every `intervalMs` while `active`. */
export function useElapsed(startedAt: number | null, active: boolean, intervalMs = 100): number {
  const [now, setNow] = useState(() => performance.now());

  useEffect(() => {
    if (!active) return;
    setNow(performance.now());
    const timer = setInterval(() => setNow(performance.now()), intervalMs);
    return () => clearInterval(timer);
  }, [active, intervalMs]);

  return startedAt === null ? 0 : Math.max(0, now - startedAt);
}

export function formatDuration(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`;
}
