import { test as base, expect, type Page, type Route } from '@playwright/test';

export const RESUME = `Alex Rivera
SUMMARY
Frontend engineer with 6 years building React and TypeScript applications for fintech products.
EXPERIENCE
- Led migration to React 18, cutting bundle size by 40%
- Mentored 4 engineers and ran weekly code reviews`;
export const JD = 'Senior Frontend Engineer: React, TypeScript, Docker, Kubernetes, mentoring and strong communication.';

export function telemetry(overrides: Record<string, unknown> = {}) {
  return {
    requestId: 'e2e-req-1',
    operation: 'analyze',
    promptVersion: 'v2',
    model: 'gemini-3.6-flash',
    modelVersion: 'gemini-3.6-flash',
    attempts: [
      { model: 'gemini-3.8-flash', ok: false, error: 'timed out' },
      { model: 'gemini-3.6-flash', ok: true },
    ],
    calls: 1,
    ttftMs: null,
    totalMs: 4200,
    usage: { promptTokens: 400, outputTokens: 300, thoughtsTokens: 0, totalTokens: 700 },
    finishReason: 'STOP',
    schema: 'valid',
    context: [{ name: 'resume', chars: RESUME.length }],
    embeddings: null,
    thinkingLevel: 'LOW',
    prompts: [{ system: 'You are an expert resume analyst.', user: '<resume>…</resume>' }],
    ...overrides,
  };
}

export const ANALYSIS = {
  matchScore: 72,
  missingKeywords: ['docker', 'kubernetes'],
  suggestedImprovements: ['Mention container experience', 'Quantify mentoring impact'],
  strengths: ['React expertise', 'Mentoring'],
  toneAnalysis: { score: 80, feedback: 'Clear and professional.' },
  atsOptimization: { score: 75, suggestions: ['Use standard headings'] },
};

export const json = (body: unknown, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) });

/** A complete SSE v2 body (Playwright fulfils in one piece; the client parser handles it identically). */
export function sse(chunks: string[], extra: Record<string, unknown> = {}) {
  const frames = [
    { type: 'meta', requestId: 'e2e-req-2', operation: 'generate-improved', promptVersion: 'v2' },
    ...chunks.map(text => ({ type: 'chunk', text })),
    { type: 'done', telemetry: telemetry({ operation: 'generate-improved', ttftMs: 900, ...extra }) },
  ];
  return { status: 200, contentType: 'text/event-stream', body: frames.map(f => `data: ${JSON.stringify(f)}\n\n`).join('') };
}

type Handler = (route: Route) => Promise<void> | void;

/** Mock API routes by path (e.g. '/analyze'). Unmocked calls fail loudly so tests never hit a network. */
export async function mockApi(page: Page, handlers: Record<string, Handler>) {
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, '');
    const handler = handlers[path];
    if (handler) return handler(route);
    if (path === '/billing/status') return route.fulfill(json({ error: 'billing disabled in e2e' }, 503));
    return route.fulfill(json({ error: `Unmocked e2e request: ${path}` }, 500));
  });
}

export async function fillInputs(page: Page, resume = RESUME, jd = JD) {
  await page.locator('#resume-text').fill(resume);
  await page.locator('#job-description-text').fill(jd);
}

// Requests the app makes on purpose that we answer with errors (they still log "Failed to load resource")
const EXPECTED_ERRORS = /Failed to load resource/;

/** Every test fails on CSP violations or uncaught page errors — so each scenario is also a security/stability check. */
export const test = base.extend<{ guard: void }>({
  guard: [
    async ({ page }, use) => {
      const problems: string[] = [];
      await page.addInitScript(() => {
        document.addEventListener('securitypolicyviolation', e => {
          console.error(`CSP violation: ${e.violatedDirective} ${e.blockedURI || 'inline'}`);
        });
      });
      page.on('pageerror', e => problems.push(`pageerror: ${e.message}`));
      page.on('console', m => {
        if (m.type() === 'error' && !EXPECTED_ERRORS.test(m.text())) problems.push(m.text());
      });
      await use();
      expect(problems, 'no CSP violations or page errors').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
