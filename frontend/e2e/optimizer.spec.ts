import { ANALYSIS, expect, fillInputs, json, mockApi, sse, telemetry, test } from './fixtures';

test.describe('Optimizer', () => {
  test('analyzes with ⌘/Ctrl+Enter, streams a tailored resume, and exports it', async ({ page }) => {
    await mockApi(page, {
      '/analyze': route => route.fulfill(json({ data: ANALYSIS, telemetry: telemetry() })),
      '/generate-improved': route =>
        route.fulfill(sse(['# Alex Rivera\n\n', '## Summary\n', 'Tailored for senior frontend roles.\n'])),
    });
    await page.goto('/');
    await fillInputs(page);
    await page.locator('#job-description-text').press('ControlOrMeta+Enter');

    await expect(page.getByText('72%').first()).toBeVisible();
    await expect(page.getByText('Mention container experience')).toBeVisible();

    // Telemetry drawer explains the fallback
    await page.getByRole('button', { name: /system telemetry/i }).first().click();
    await expect(page.getByText('Fallback chain')).toBeVisible();
    await expect(page.getByText(/gemini-3.8-flash — error timed out/)).toBeVisible();

    await page.getByRole('button', { name: /generate tailored resume/i }).click();
    await expect(page.getByRole('heading', { name: 'Summary' })).toBeVisible();
    await expect(page.getByText(/Done in/)).toBeVisible();

    for (const [label, file] of [['PDF', 'tailored-resume.pdf'], ['Word', 'tailored-resume.docx']]) {
      const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: label, exact: true }).click()]);
      expect(download.suggestedFilename()).toBe(file);
    }

    await page.getByRole('tab', { name: /changes/i }).click();
    // diffWords may split the added sentence across several <mark>s
    await expect(page.locator('mark').filter({ hasText: 'Tailored' }).first()).toBeVisible();
  });

  test('cancels an analysis and stops a generation (Esc) without errors', async ({ page }) => {
    let release = () => {};
    const hang = new Promise<void>(resolve => (release = resolve));
    let analyzeCalls = 0;
    await mockApi(page, {
      '/analyze': async route => {
        analyzeCalls += 1;
        if (analyzeCalls === 1) return hang.then(() => route.abort().catch(() => {}));
        return route.fulfill(json({ data: ANALYSIS, telemetry: telemetry() }));
      },
      '/generate-improved': route => hang.then(() => route.abort().catch(() => {})),
    });
    await page.goto('/');
    await fillInputs(page);

    await page.getByRole('button', { name: /analyze resume/i }).click();
    await page.getByRole('button', { name: /cancel analysis/i }).click();
    await expect(page.getByText('Add your resume', { exact: true })).toBeVisible(); // back to the empty state
    await expect(page.getByRole('alert')).toHaveCount(0);

    await page.getByRole('button', { name: /analyze resume/i }).click();
    await page.getByRole('button', { name: /generate tailored resume/i }).click();
    await expect(page.getByText('Waiting for first token')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: /generate tailored resume/i })).toBeEnabled();
    await expect(page.getByRole('alert')).toHaveCount(0);
    release();
  });

  test('falls back to the local heuristic when the AI service is down', async ({ page }) => {
    await mockApi(page, {
      '/analyze': route => route.fulfill(json({ error: 'Gemini is temporarily unavailable.', code: 'UNAVAILABLE' }, 503)),
    });
    await page.goto('/');
    await fillInputs(page);
    await page.getByRole('button', { name: /analyze resume/i }).click();

    await expect(page.getByText(/AI unavailable — showing a local keyword analysis/)).toBeVisible();
    await expect(page.getByText('source: local heuristic')).toBeVisible();
  });

  test('shows a persistent error with telemetry for rate limits (no fake score)', async ({ page }) => {
    await mockApi(page, {
      '/analyze': route =>
        route.fulfill(json({ error: 'Too many AI requests. Please wait a moment.', code: 'RATE_LIMITED', telemetry: telemetry() }, 429)),
    });
    await page.goto('/');
    await fillInputs(page);
    await page.getByRole('button', { name: /analyze resume/i }).click();

    await expect(page.getByRole('alert')).toContainText('Too many AI requests');
    await expect(page.getByRole('button', { name: /system telemetry/i })).toBeVisible();
    await expect(page.getByText(/local keyword analysis/)).toHaveCount(0);
  });

  test('opens the pricing dialog when the usage limit is reached', async ({ page }) => {
    await mockApi(page, {
      '/analyze': route => route.fulfill(json({ error: 'Monthly limit reached.', code: 'USAGE_LIMIT_REACHED' }, 402)),
    });
    await page.goto('/');
    await fillInputs(page);
    await page.getByRole('button', { name: /analyze resume/i }).click();

    const dialog = page.getByRole('dialog', { name: 'Upgrade to Pro' });
    await expect(dialog).toBeVisible();

    // Fits (and scrolls within) a short phone screen
    await page.setViewportSize({ width: 375, height: 600 });
    // poll: layout settles asynchronously after the resize
    await expect.poll(async () => {
      const box = await dialog.boundingBox();
      return box ? box.y >= 0 && box.y + box.height <= 600 : false;
    }).toBe(true);

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    // The dialog is the explanation — no duplicate inline error behind it
    await expect(page.getByRole('alert')).toHaveCount(0);
  });

  test('extracts text from an uploaded PDF (pdf.js worker under the production CSP)', async ({ page, context }) => {
    const maker = await context.newPage();
    await maker.setContent('<h1>Jordan Lee</h1><p>Platform engineer with eight years of Go and Kubernetes experience.</p>');
    const pdf = await maker.pdf();
    await maker.close();

    await mockApi(page, {});
    await page.goto('/');
    await page.getByRole('tab', { name: 'Upload' }).first().click();
    await page.setInputFiles('#resume-upload', { name: 'resume.pdf', mimeType: 'application/pdf', buffer: pdf });

    await expect(page.locator('#resume-text')).toHaveValue(/Kubernetes/);
  });
});
