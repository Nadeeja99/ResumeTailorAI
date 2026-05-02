import Stripe from 'stripe';

function getInstance(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key === 'your_stripe_secret_key_here') {
    throw new Error('STRIPE_SECRET_KEY is not set in backend/.env');
  }
  return new Stripe(key);
}

export async function createCheckoutSession(
  userId: string,
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  const stripe = getInstance();
  const priceId = process.env.STRIPE_PRO_PRICE_ID;
  if (!priceId || priceId === 'your_stripe_price_id_here') {
    throw new Error('STRIPE_PRO_PRICE_ID is not set in backend/.env');
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { userId },
    subscription_data: { metadata: { userId } },
  });

  return session.url!;
}

export async function createPortalSession(
  stripeCustomerId: string,
  returnUrl: string
): Promise<string> {
  const stripe = getInstance();
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: returnUrl,
  });
  return session.url;
}

export function constructWebhookEvent(
  payload: Buffer,
  signature: string
): Stripe.Event {
  const stripe = getInstance();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || secret === 'your_stripe_webhook_secret_here') {
    throw new Error('STRIPE_WEBHOOK_SECRET is not set in backend/.env');
  }
  return stripe.webhooks.constructEvent(payload, signature, secret);
}

export type { Stripe };
