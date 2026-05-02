import { v4 as uuidv4 } from 'uuid';

const USER_ID_KEY = 'resume_tailor_user_id';

export function getUserId(): string {
  let id = localStorage.getItem(USER_ID_KEY);
  if (!id) {
    id = uuidv4();
    localStorage.setItem(USER_ID_KEY, id);
  }
  return id;
}

export interface UsageStatus {
  plan: 'free' | 'pro';
  usageCount: number;
  usageLimit: number | null;
  hasReachedLimit: boolean;
}

export async function fetchUsageStatus(): Promise<UsageStatus> {
  const userId = getUserId();
  const res = await fetch(`/api/billing/status?userId=${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error('Failed to fetch usage status.');
  return res.json();
}

export async function createCheckoutSession(): Promise<string> {
  const userId = getUserId();
  const origin = window.location.origin;
  const res = await fetch('/api/billing/create-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      successUrl: `${origin}/?upgraded=1`,
      cancelUrl: `${origin}/`,
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? 'Failed to create checkout session.');
  }
  const { url } = await res.json();
  return url;
}

export async function openBillingPortal(): Promise<string> {
  const userId = getUserId();
  const origin = window.location.origin;
  const res = await fetch('/api/billing/portal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, returnUrl: origin }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? 'Failed to open billing portal.');
  }
  const { url } = await res.json();
  return url;
}
