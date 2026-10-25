import { describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { loadEnv } from '../config/env.js';

describe('GET /api/health', () => {
  it('reports database and AI configuration', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body).toMatchObject({
      status: 'ok',
      checks: { database: 'ok', aiConfigured: true },
      ai: { models: expect.any(Array), embeddingModel: expect.any(String), promptVersion: expect.any(String) },
    });
  });
});

describe('HTTP hardening', () => {
  it('sets security headers and hides the framework', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('echoes a well-formed X-Request-Id and replaces malformed ones', async () => {
    const kept = await request(app).get('/api/health').set('X-Request-Id', 'upstream-id-1234');
    expect(kept.headers['x-request-id']).toBe('upstream-id-1234');

    const replaced = await request(app).get('/api/health').set('X-Request-Id', 'bad id!');
    expect(replaced.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('returns JSON 404 for unknown API routes', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ code: 'NOT_FOUND' });
  });

  it('returns JSON 400 for malformed request bodies', async () => {
    const res = await request(app).post('/api/analyze').set('Content-Type', 'application/json').send('{"resume":');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Malformed request body.', code: 'BAD_REQUEST' });
  });
});

describe('loadEnv', () => {
  it('applies defaults and parses lists', () => {
    const env = loadEnv({ NODE_ENV: 'development', GEMINI_MODELS: 'a, b ,,c', CORS_ORIGINS: 'https://x.dev' });
    expect(env.GEMINI_MODELS).toEqual(['a', 'b', 'c']);
    expect(env.CORS_ORIGINS).toEqual(['https://x.dev']);
    expect(env.PORT).toBe(3001);
    expect(env.EXPOSE_PROMPTS).toBe(true);
    expect(env.LOG_LEVEL).toBe('info');
  });

  it('treats empty values (docker-compose passthrough) as unset', () => {
    const env = loadEnv({ GEMINI_MODELS: '', LLM_THINKING_LEVEL: '', EXPOSE_PROMPTS: '' });
    expect(env.GEMINI_MODELS.length).toBeGreaterThan(0);
    expect(env.LLM_THINKING_LEVEL).toBeUndefined();
  });

  it('treats the placeholder key as unset', () => {
    expect(loadEnv({ GEMINI_API_KEY: 'your_gemini_api_key_here' }).GEMINI_API_KEY).toBe('');
  });

  it('requires an API key in production and hides prompts by default', () => {
    expect(() => loadEnv({ NODE_ENV: 'production' })).toThrow(/GEMINI_API_KEY: is required in production/);
    expect(loadEnv({ NODE_ENV: 'production', GEMINI_API_KEY: 'k' }).EXPOSE_PROMPTS).toBe(false);
  });

  it('rejects invalid values', () => {
    expect(() => loadEnv({ PORT: 'abc' })).toThrow(/PORT/);
    expect(() => loadEnv({ LLM_THINKING_LEVEL: 'EXTREME' })).toThrow(/LLM_THINKING_LEVEL/);
  });
});
