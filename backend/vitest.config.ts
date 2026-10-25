import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    env: { NODE_ENV: 'test', GEMINI_API_KEY: 'test-key' },
  },
});
