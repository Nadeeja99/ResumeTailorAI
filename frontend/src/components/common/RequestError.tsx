import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RequestErrorProps {
  error: Error;
  onRetry?: () => void;
  className?: string;
}

/** Inline, persistent error for a failed AI request — unlike a toast, it stays until resolved. */
export function RequestError({ error, onRetry, className }: RequestErrorProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center',
        className
      )}
    >
      <AlertCircle className="h-4 w-4 shrink-0 text-destructive" aria-hidden />
      <p className="flex-1 text-sm">{error.message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCcw /> Retry
        </Button>
      )}
    </div>
  );
}
