import { useEffect } from 'react';
import { CheckCircle2, Loader2, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/common/Kbd';
import type { AIStatus } from '@/hooks/useAI';
import { formatDuration, useElapsed } from '@/hooks/useElapsed';
import type { ClientTiming } from '@/types/ai';

interface StreamControlsProps {
  status: AIStatus;
  startedAt: number | null;
  firstChunkAt: number | null;
  /** Characters received so far. */
  chars: number;
  timing: ClientTiming | null;
  onStop: () => void;
}

// ~4 characters per token for English prose — good enough for a live rate readout.
const CHARS_PER_TOKEN = 4;

/** Live status for a streaming generation: waiting → writing (elapsed, ~tok/s) → done / stopped. Esc stops. */
export function StreamControls({ status, startedAt, firstChunkAt, chars, timing, onStop }: StreamControlsProps) {
  const pending = status === 'loading' || status === 'streaming';
  const elapsed = useElapsed(startedAt, pending);

  useEffect(() => {
    if (!pending) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) onStop();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pending, onStop]);

  if (status === 'idle') return null;

  const writingMs = firstChunkAt !== null && startedAt !== null ? startedAt + elapsed - firstChunkAt : 0;
  const tokPerSec = writingMs > 500 ? Math.round(chars / CHARS_PER_TOKEN / (writingMs / 1000)) : null;

  let label: string;
  if (status === 'loading') label = 'Waiting for first token';
  else if (status === 'streaming') label = 'Writing';
  else if (status === 'aborted') label = 'Stopped';
  else if (status === 'error') label = 'Failed';
  else label = `Done in ${formatDuration(timing?.totalMs ?? elapsed)}`;

  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5" aria-live="polite">
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" aria-hidden />
        ) : status === 'success' ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden />
        ) : null}
        <span className={pending ? 'font-medium text-foreground' : undefined}>{label}</span>
      </span>
      {pending && (
        <>
          <span className="tabular-nums">{formatDuration(elapsed)}</span>
          {tokPerSec !== null && <span className="hidden tabular-nums sm:inline">~{tokPerSec} tok/s</span>}
          <Button variant="outline" size="sm" onClick={onStop} className="h-7 gap-1.5 px-2 text-xs">
            <Square className="h-3 w-3 fill-current" /> Stop <Kbd className="hidden sm:inline-flex">Esc</Kbd>
          </Button>
        </>
      )}
    </div>
  );
}
