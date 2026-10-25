import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { createCheckoutSession } from '../lib/userStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { cn, getErrorMessage } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
  usageCount: number;
  usageLimit: number;
}

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    features: ['3 AI analyses per month', 'Resume optimisation', 'Cover letter generation', 'Job comparison (up to 5)'],
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$9',
    features: ['Unlimited AI analyses', 'Semantic embeddings scoring', 'Priority processing', 'All free features'],
    highlighted: true,
  },
];

export default function PricingModal({ open, onClose, usageCount, usageLimit }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpgrade() {
    setLoading(true);
    setError(null);
    try {
      const url = await createCheckoutSession();
      window.location.href = url;
    } catch (e: unknown) {
      setError(getErrorMessage(e, 'Could not start checkout.'));
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={next => !next && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Upgrade to Pro</DialogTitle>
          <DialogDescription>
            You've used {usageCount} of {usageLimit} free analyses this month.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {PLANS.map(plan => (
            <div
              key={plan.name}
              className={cn('rounded-lg border p-5', plan.highlighted && 'border-primary ring-1 ring-primary')}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">{plan.name}</span>
                {plan.highlighted && <Badge>Popular</Badge>}
              </div>
              <p className="mb-4 text-2xl font-semibold">
                {plan.price}
                {plan.highlighted && <span className="text-sm font-normal text-muted-foreground">/mo</span>}
              </p>
              <ul className="space-y-2">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check
                      className={cn('mt-0.5 h-4 w-4 shrink-0', plan.highlighted ? 'text-primary' : 'text-muted-foreground')}
                      aria-hidden
                    />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {error && (
          <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Maybe later
          </Button>
          <Button onClick={handleUpgrade} disabled={loading}>
            {loading && <Loader2 className="animate-spin" />}
            {loading ? 'Redirecting…' : 'Upgrade to Pro'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
