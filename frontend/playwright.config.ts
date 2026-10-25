import { defineConfig, devices } from '@playwright/test';

const CI = Boolean(process.env.CI);
const PORT = 4173;

// Smoke suite against the production build (`vite preview`, served with the nginx security
// headers). Every /api call is mocked in the browser, so no backend or Gemini key is needed.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    // Locally reuse the installed Chrome; CI installs Playwright's Chromium
    ...(CI ? {} : { channel: 'chrome' }),
  },
  projects: [
    { name: 'desktop-light', use: { ...devices['Desktop Chrome'], colorScheme: 'light' } },
    { name: 'mobile-dark', use: { ...devices['Pixel 7'], colorScheme: 'dark' } },
  ],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !CI,
    timeout: 120_000,
  },
});
