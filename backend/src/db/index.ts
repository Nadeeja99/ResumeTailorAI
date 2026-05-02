import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.NODE_ENV === 'test'
  ? ':memory:'
  : path.join(__dirname, '../../../data/app.db');

// Ensure data directory exists for non-test environments
if (process.env.NODE_ENV !== 'test') {
  const { mkdirSync } = await import('fs');
  mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id                    TEXT PRIMARY KEY,
    plan                  TEXT NOT NULL DEFAULT 'free',
    stripe_customer_id    TEXT,
    stripe_subscription_id TEXT,
    created_at            INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS usage (
    user_id    TEXT NOT NULL,
    year_month TEXT NOT NULL,
    count      INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, year_month),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// ── Prepared statements ───────────────────────────────────────────────────────

const stmts = {
  upsertUser: db.prepare(`
    INSERT INTO users (id) VALUES (?)
    ON CONFLICT(id) DO NOTHING
  `),

  getUser: db.prepare(`
    SELECT id, plan, stripe_customer_id, stripe_subscription_id
    FROM users WHERE id = ?
  `),

  getUserByStripeCustomer: db.prepare(`
    SELECT id FROM users WHERE stripe_customer_id = ?
  `),

  getUsage: db.prepare(`
    SELECT count FROM usage WHERE user_id = ? AND year_month = ?
  `),

  incrementUsage: db.prepare(`
    INSERT INTO usage (user_id, year_month, count) VALUES (?, ?, 1)
    ON CONFLICT(user_id, year_month) DO UPDATE SET count = count + 1
  `),

  updatePlan: db.prepare(`
    UPDATE users
    SET plan = ?, stripe_customer_id = ?, stripe_subscription_id = ?
    WHERE id = ?
  `),
};

// ── Public helpers ────────────────────────────────────────────────────────────

export type Plan = 'free' | 'pro';

export interface User {
  id: string;
  plan: Plan;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

function yearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function ensureUser(userId: string): User {
  stmts.upsertUser.run(userId);
  return stmts.getUser.get(userId) as User;
}

export function getMonthlyUsage(userId: string): number {
  const row = stmts.getUsage.get(userId, yearMonth()) as { count: number } | undefined;
  return row?.count ?? 0;
}

export function incrementUsage(userId: string): void {
  ensureUser(userId);
  stmts.incrementUsage.run(userId, yearMonth());
}

export function upgradeToPro(
  userId: string,
  stripeCustomerId: string,
  stripeSubscriptionId: string
): void {
  stmts.updatePlan.run('pro', stripeCustomerId, stripeSubscriptionId, userId);
}

export function downgradeToFree(stripeCustomerId: string): void {
  const user = stmts.getUserByStripeCustomer.get(stripeCustomerId) as { id: string } | undefined;
  if (user) {
    stmts.updatePlan.run('free', stripeCustomerId, null, user.id);
  }
}

export default db;
