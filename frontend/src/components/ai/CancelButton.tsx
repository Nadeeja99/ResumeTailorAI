import { Loader2 } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { formatDuration, useElapsed } from '@/hooks/useElapsed';
import { cn } from '@/lib/utils';

interface CancelButtonProps extends Pick<ButtonProps, 'size' | 'className'> {
  startedAt: number | null;
  onCancel: () => void;
  label?: string;
}

/** Shown while a request is in flight: spinner, live elapsed time, and cancel. */
export function CancelButton({ startedAt, onCancel, label = 'Cancel', size, className }: CancelButtonProps) {
  const elapsed = useElapsed(startedAt, true, 250);
  return (
    <Button variant="outline" size={size} onClick={onCancel} className={cn('shrink-0', className)}>
      <Loader2 className="animate-spin" />
      {label}
      <span className="tabular-nums text-muted-foreground">{formatDuration(elapsed)}</span>
    </Button>
  );
}
