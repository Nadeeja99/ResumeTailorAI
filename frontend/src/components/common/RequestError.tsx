import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TelemetryDrawer } from '@/components/ai/telemetry/TelemetryDrawer';
import { cn } from '@/lib/utils';
import type { AITelemetry } from '@/types/ai';

interface RequestErrorProps {
  error: Error;
  onRetry?: () => void;
  /** Server telemetry for the failed request — shows which models were tried and why they failed. */
  telemetry?: AITelemetry | null;
  className?: string;
}

/** Inline, persistent error for a failed AI request — unlike a toast, it stays until resolved. */
export function RequestError({ error, onRetry, telemetry, className }: RequestErrorProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <div role="alert" className="flex flex-col gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center">
        <AlertCircle className="h-4 w-4 shrink-0 text-destructive" aria-hidden />
        <p className="flex-1 text-sm">{error.message}</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RotateCcw /> Retry
          </Button>
        )}
      </div>
      {telemetry && <TelemetryDrawer telemetry={telemetry} timing={null} />}
    </div>
  );
}
