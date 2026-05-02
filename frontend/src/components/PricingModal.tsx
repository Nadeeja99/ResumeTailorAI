import { useState } from 'react';
import { createCheckoutSession } from '../lib/userStore';

interface Props {
  open: boolean;
  onClose: () => void;
  usageCount: number;
  usageLimit: number;
}

const FREE_FEATURES = [
  '3 AI analyses per month',
  'Resume optimisation',
  'Cover letter generation',
  'Job comparison (up to 5)',
];

const PRO_FEATURES = [
  'Unlimited AI analyses',
  'Semantic embeddings scoring',
  'Priority processing',
  'All free features',
];

export default function PricingModal({ open, onClose, usageCount, usageLimit }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleUpgrade() {
    setLoading(true);
    setError(null);
    try {
      const url = await createCheckoutSession();
      window.location.href = url;
    } catch (e: unknown) {
      setError((e as Error).message ?? 'Could not start checkout.');
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold">Upgrade to Pro</h2>
              <p className="text-indigo-100 text-sm mt-1">
                You've used {usageCount} of {usageLimit} free analyses this month.
              </p>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white text-xl leading-none">✕</button>
          </div>
        </div>

        {/* Plans */}
        <div className="p-6 grid grid-cols-2 gap-4">
          {/* Free plan */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">Free</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-4">$0</div>
            <ul className="space-y-2">
              {FREE_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300">
                  <span className="text-gray-400 mt-0.5">○</span>{f}
                </li>
              ))}
            </ul>
          </div>

          {/* Pro plan */}
          <div className="rounded-xl border-2 border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 p-4 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-indigo-600 text-white text-xs font-bold px-3 py-0.5 rounded-full">POPULAR</span>
            </div>
            <div className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-1">Pro</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              $9<span className="text-sm font-normal text-gray-400">/mo</span>
            </div>
            <ul className="space-y-2">
              {PRO_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-2 text-xs text-gray-700 dark:text-gray-200">
                  <span className="text-indigo-500 mt-0.5">✓</span>{f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {error && (
          <div className="mx-6 mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            Maybe later
          </button>
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-60 transition"
          >
            {loading ? 'Redirecting…' : 'Upgrade to Pro →'}
          </button>
        </div>
      </div>
    </div>
  );
}
