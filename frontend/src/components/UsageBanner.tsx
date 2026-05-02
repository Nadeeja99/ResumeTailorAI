import { UsageStatus, openBillingPortal } from '../lib/userStore';

interface Props {
  status: UsageStatus | null;
  onUpgradeClick: () => void;
}

export default function UsageBanner({ status, onUpgradeClick }: Props) {
  if (!status || status.plan === 'pro') return null;

  const remaining = (status.usageLimit ?? 3) - status.usageCount;
  const pct = Math.min(100, (status.usageCount / (status.usageLimit ?? 3)) * 100);
  const isExhausted = status.hasReachedLimit;

  if (isExhausted) {
    return (
      <div className="w-full rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-red-700 dark:text-red-300">Monthly limit reached</p>
          <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">
            You've used all 3 free analyses for this month.
          </p>
        </div>
        <button
          onClick={onUpgradeClick}
          className="shrink-0 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition"
        >
          Upgrade to Pro
        </button>
      </div>
    );
  }

  return (
    <div className="w-full rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
          Free plan — {remaining} analysis{remaining !== 1 ? 'es' : ''} remaining this month
        </p>
        <button
          onClick={onUpgradeClick}
          className="text-xs font-semibold text-amber-700 dark:text-amber-300 hover:underline"
        >
          Upgrade →
        </button>
      </div>
      <div className="h-1.5 rounded-full bg-amber-200 dark:bg-amber-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-amber-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
