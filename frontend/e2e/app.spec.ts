import { expect, fillInputs, json, mockApi, telemetry, test } from './fixtures';

const SEMANTIC = {
  overallScore: 78,
  sections: [{ name: 'Experience', score: 74, rawSimilarity: 0.729, chars: 204, excerpt: 'Led migration…', text: 'Led migration to React 18' }],
  requirementCoverage: [
    { requirement: 'Mentoring junior engineers', covered: true, score: 100, rawSimilarity: 0.807, bestSection: 'Experience', evidence: 'Mentored 4 engineers and ran weekly code reviews', matchedTerms: ['mentoring'] },
    { requirement: 'Docker containerization', covered: false, score: 61, rawSimilarity: 0.701, bestSection: 'Skills', evidence: 'React, TypeScript, Node.js, Jest, CI/CD, AWS', matchedTerms: [] },
  ],
  topGaps: ['Docker containerization'],
  embeddingModel: 'gemini-embedding-2',
  calibration: { model: 'gemini-embedding-2', floor: 0.58, range: 0.2, coveredThreshold: 50, strongSimilarity: 0.8 },
  evidenceChunks: 6,
};

test.describe('App shell', () => {
  test('serves the production security headers', async ({ page }) => {
    await mockApi(page, {});
    const response = await page.goto('/');
    const csp = response?.headers()['content-security-policy'] ?? '';
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toMatch(/script-src 'self' 'sha256-/);
    expect(response?.headers()['x-content-type-options']).toBe('nosniff');
  });

  test('persists the chosen theme across reloads', async ({ page }) => {
    await mockApi(page, {});
    await page.goto('/');
    const html = page.locator('html');

    await page.getByRole('radio', { name: 'Dark theme' }).click();
    await expect(html).toHaveClass(/dark/);
    await page.reload();
    await expect(html).toHaveClass(/dark/);

    await page.getByRole('radio', { name: 'Light theme' }).click();
    await page.reload();
    await expect(html).not.toHaveClass(/dark/);
  });

  test('has no horizontal overflow', async ({ page }) => {
    await mockApi(page, {});
    await page.goto('/');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('gates tools until inputs are valid, then shows the chunk inspector', async ({ page }) => {
    await mockApi(page, {
      '/semantic-analysis': route =>
        route.fulfill(json({ data: SEMANTIC, telemetry: telemetry({ operation: 'semantic-analysis', embeddings: { model: 'gemini-embedding-2', calls: 2, inputs: 14 } }) })),
    });
    await page.goto('/');
    await page.getByRole('tab', { name: /semantic match/i }).click();
    await expect(page.getByText('Resume and job description needed')).toBeVisible();

    await page.getByRole('tab', { name: /optimizer/i }).click();
    await fillInputs(page);
    await page.getByRole('tab', { name: /semantic match/i }).click();
    await page.getByRole('button', { name: 'Run analysis' }).click();

    await page.getByRole('button', { name: /chunk inspector/i }).click();
    await expect(page.getByText('“Mentored 4 engineers and ran weekly code reviews”', { exact: false })).toBeVisible();
    await expect(page.getByText('no keyword match')).toBeVisible();
  });

  test('renders a friendly 404', async ({ page }) => {
    await mockApi(page, {});
    await page.goto('/does-not-exist');
    await expect(page.getByText('Page not found')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to the app' })).toBeVisible();
  });
});
