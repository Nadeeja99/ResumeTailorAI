import { UsageStatus } from '../lib/userStore';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface Props {
  status: UsageStatus | null;
  onUpgradeClick: () => void;
}

export default function UsageBanner({ status, onUpgradeClick }: Props) {
  if (!status || status.plan === 'pro') return null;

  const limit = status.usageLimit ?? 3;
  const remaining = Math.max(0, limit - status.usageCount);
  const pct = Math.min(100, (status.usageCount / limit) * 100);
  const isExhausted = status.hasReachedLimit;

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between',
        isExhausted ? 'border-destructive/30 bg-destructive/5' : 'bg-card'
      )}
    >
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-sm font-medium">
          {isExhausted
            ? 'Monthly limit reached'
            : `Free plan · ${remaining} ${remaining === 1 ? 'analysis' : 'analyses'} left this month`}
        </p>
        {isExhausted ? (
          <p className="text-sm text-muted-foreground">You've used all {limit} free analyses for this month.</p>
        ) : (
          <Progress value={pct} className="h-1.5 max-w-xs" indicatorClassName="bg-warning" />
        )}
      </div>
      <Button size="sm" variant={isExhausted ? 'default' : 'outline'} onClick={onUpgradeClick}>
        Upgrade to Pro
      </Button>
    </div>
  );
}
