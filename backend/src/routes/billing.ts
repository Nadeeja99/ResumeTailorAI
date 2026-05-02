import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  createCheckoutSession,
  createPortalSession,
  constructWebhookEvent,
  type Stripe,
} from '../services/stripe.js';
import { ensureUser, upgradeToPro, downgradeToFree, getMonthlyUsage } from '../db/index.js';
import { validate } from '../middleware/validate.js';

const router = Router();

const checkoutSchema = z.object({
  userId: z.string().min(1),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

const portalSchema = z.object({
  userId: z.string().min(1),
  returnUrl: z.string().url(),
});

// ── POST /api/billing/create-checkout ────────────────────────────────────────
router.post('/create-checkout', validate(checkoutSchema), async (req: Request, res: Response) => {
  try {
    const { userId, successUrl, cancelUrl } = req.body;
    ensureUser(userId);
    const url = await createCheckoutSession(userId, successUrl, cancelUrl);
    res.json({ url });
  } catch (error: unknown) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// ── POST /api/billing/portal ──────────────────────────────────────────────────
router.post('/portal', validate(portalSchema), async (req: Request, res: Response) => {
  try {
    const { userId, returnUrl } = req.body;
    const user = ensureUser(userId);
    if (!user.stripe_customer_id) {
      return res.status(400).json({ error: 'No active subscription found.' });
    }
    const url = await createPortalSession(user.stripe_customer_id, returnUrl);
    res.json({ url });
  } catch (error: unknown) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// ── GET /api/billing/status ───────────────────────────────────────────────────
router.get('/status', async (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: 'userId is required.' });

  try {
    const user = ensureUser(userId);
    const usageCount = getMonthlyUsage(userId);
    const FREE_LIMIT = 3;
    res.json({
      plan: user.plan,
      usageCount,
      usageLimit: user.plan === 'pro' ? null : FREE_LIMIT,
      hasReachedLimit: user.plan === 'free' && usageCount >= FREE_LIMIT,
    });
  } catch (error: unknown) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// ── POST /api/billing/webhook ─────────────────────────────────────────────────
// Raw body required — mounted before express.json() in app.ts
router.post('/webhook', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  if (!sig) return res.status(400).json({ error: 'Missing stripe-signature header.' });

  let event: Stripe.Event;
  try {
    event = constructWebhookEvent(req.body as Buffer, sig);
  } catch (err) {
    console.error('[Stripe webhook] signature verification failed:', (err as Error).message);
    return res.status(400).json({ error: 'Webhook signature verification failed.' });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        if (userId && session.customer && session.subscription) {
          upgradeToPro(userId, session.customer as string, session.subscription as string);
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        downgradeToFree(sub.customer as string);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        // Optionally notify user; downgrade handled by subscription.deleted
        console.warn('[Stripe] Payment failed for customer:', invoice.customer);
        break;
      }
    }
    res.json({ received: true });
  } catch (err) {
    console.error('[Stripe webhook] handler error:', err);
    res.status(500).json({ error: 'Webhook handler failed.' });
  }
});

export default router;
