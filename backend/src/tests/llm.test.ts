import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ApiError } from '@google/genai';
import { env } from '../config/env.js';
import { generateStructured } from '../services/llm/structured.js';
import { streamText } from '../services/llm/text.js';
import { TelemetryTracker } from '../services/llm/telemetry.js';
import { AIError } from '../services/llm/errors.js';
import { semanticAnalysis } from '../services/embeddings.js';
import type { CallContext } from '../services/llm/client.js';

const models = vi.hoisted(() => ({
  generateContent: vi.fn(),
  generateContentStream: vi.fn(),
  embedContent: vi.fn(),
}));

vi.mock('@google/genai', async importOriginal => ({
  ...(await importOriginal<typeof import('@google/genai')>()),
  GoogleGenAI: class {
    models = models;
  },
}));

const PROMPT = { system: 'You are a test system prompt.', user: 'prompt' };
const schema = z.object({ score: z.number().int().min(0).max(100), tags: z.array(z.string()) });

const usage = (prompt: number, output: number) => ({
  promptTokenCount: prompt,
  candidatesTokenCount: output,
  totalTokenCount: prompt + output,
});
const reply = (text: string, extra: object = {}) => ({ text, usageMetadata: usage(10, 5), ...extra });

function makeCtx(signal = new AbortController().signal): CallContext {
  return { tracker: new TelemetryTracker({ requestId: 'req-1', operation: 'test', context: { resume: 'abc' } }), signal };
}

async function collect(gen: AsyncGenerator<string>): Promise<string[]> {
  const out: string[] = [];
  for await (const chunk of gen) out.push(chunk);
  return out;
}

beforeEach(() => {
  vi.clearAllMocks();
  env.EXPOSE_PROMPTS = true;
});

describe('generateStructured', () => {
  it('returns validated data and sends the JSON schema to the model', async () => {
    models.generateContent.mockResolvedValueOnce(reply('{"score": 80, "tags": ["a"]}'));
    const ctx = makeCtx();

    await expect(generateStructured(PROMPT, schema, ctx)).resolves.toEqual({ score: 80, tags: ['a'] });

    const config = models.generateContent.mock.calls[0][0].config;
    expect(config.responseMimeType).toBe('application/json');
    expect(config.responseJsonSchema).toMatchObject({ type: 'object', required: ['score', 'tags'] });
    expect(config.responseJsonSchema).not.toHaveProperty('$schema');
    expect(ctx.tracker.snapshot()).toMatchObject({
      model: env.GEMINI_MODELS[0],
      schema: 'valid',
      calls: 1,
      usage: { promptTokens: 10, outputTokens: 5, totalTokens: 15 },
      ttftMs: null,
    });
  });

  it('repairs invalid output with one extra call and sums usage', async () => {
    models.generateContent
      .mockResolvedValueOnce(reply('{"score": 140, "tags": ["a"]}'))
      .mockResolvedValueOnce(reply('{"score": 100, "tags": ["a"]}'));
    const ctx = makeCtx();

    await expect(generateStructured(PROMPT, schema, ctx)).resolves.toEqual({ score: 100, tags: ['a'] });

    const repairPrompt: string = models.generateContent.mock.calls[1][0].contents;
    expect(repairPrompt).toContain('score:');
    expect(ctx.tracker.snapshot()).toMatchObject({ schema: 'repaired', calls: 2, usage: { totalTokens: 30 } });
    expect(ctx.tracker.snapshot().prompts).toHaveLength(2);
  });

  it('fails with INVALID_OUTPUT when repair also fails', async () => {
    models.generateContent.mockResolvedValue(reply('not json'));
    const ctx = makeCtx();

    await expect(generateStructured(PROMPT, schema, ctx)).rejects.toMatchObject({ code: 'INVALID_OUTPUT', status: 502 });
    expect(ctx.tracker.snapshot().schema).toBe('failed');
  });

  it('falls back to the next model when a model is unavailable', async () => {
    models.generateContent
      .mockRejectedValueOnce(new ApiError({ message: 'model not found', status: 404 }))
      .mockResolvedValueOnce(reply('{"score": 50, "tags": []}'));
    const ctx = makeCtx();

    await generateStructured(PROMPT, schema, ctx);

    const used = models.generateContent.mock.calls.map(c => c[0].model);
    expect(used).toEqual(env.GEMINI_MODELS.slice(0, 2));
    expect(ctx.tracker.snapshot().attempts).toEqual([
      { model: env.GEMINI_MODELS[0], ok: false, status: 404, error: 'model not found' },
      { model: env.GEMINI_MODELS[1], ok: true },
    ]);
  });

  it('records the readable message from Gemini’s nested JSON errors', async () => {
    const nested = JSON.stringify({
      error: { message: JSON.stringify({ error: { code: 503, message: 'This model is currently experiencing high demand.' } }) },
    });
    models.generateContent
      .mockRejectedValueOnce(new ApiError({ message: nested, status: 503 }))
      .mockResolvedValueOnce(reply('{"score": 50, "tags": []}'));
    const ctx = makeCtx();

    await generateStructured(PROMPT, schema, ctx);

    expect(ctx.tracker.snapshot().attempts[0]).toEqual({
      model: env.GEMINI_MODELS[0],
      ok: false,
      status: 503,
      error: 'This model is currently experiencing high demand.',
    });
  });

  it('does not fall back on auth errors', async () => {
    models.generateContent.mockRejectedValue(new ApiError({ message: 'API key not valid', status: 400 }));

    await expect(generateStructured(PROMPT, schema, makeCtx())).rejects.toMatchObject({ code: 'AUTH' });
    expect(models.generateContent).toHaveBeenCalledTimes(1);
  });

  it('reports ABORTED when the client signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(generateStructured(PROMPT, schema, makeCtx(controller.signal))).rejects.toMatchObject({ code: 'ABORTED' });
    expect(models.generateContent).not.toHaveBeenCalled();
  });

  it('omits prompts from telemetry when EXPOSE_PROMPTS is off', async () => {
    env.EXPOSE_PROMPTS = false;
    models.generateContent.mockResolvedValueOnce(reply('{"score": 1, "tags": []}'));
    const ctx = makeCtx();

    await generateStructured({ system: 'sys', user: 'secret resume' }, schema, ctx);

    expect(ctx.tracker.snapshot()).not.toHaveProperty('prompts');
  });
});

describe('streamText', () => {
  it('yields chunks and records TTFT, usage and finish reason from the final chunk', async () => {
    models.generateContentStream.mockResolvedValueOnce(
      (async function* () {
        yield { text: 'Hello' };
        yield { text: ' world', usageMetadata: usage(20, 2), candidates: [{ finishReason: 'STOP' }], modelVersion: 'v-123' };
      })()
    );
    const ctx = makeCtx();

    await expect(collect(streamText(PROMPT, ctx))).resolves.toEqual(['Hello', ' world']);

    const t = ctx.tracker.snapshot();
    expect(t.ttftMs).not.toBeNull();
    expect(t.ttftMs!).toBeLessThanOrEqual(t.totalMs);
    expect(t).toMatchObject({ finishReason: 'STOP', modelVersion: 'v-123', usage: { promptTokens: 20, outputTokens: 2 } });
  });

  it('raises a BLOCKED error instead of streaming nothing', async () => {
    models.generateContentStream.mockResolvedValueOnce(
      (async function* () {
        yield { text: '', promptFeedback: { blockReason: 'SAFETY' } };
      })()
    );

    await expect(collect(streamText(PROMPT, makeCtx()))).rejects.toMatchObject({ code: 'BLOCKED' });
  });

  it('maps a mid-stream abort to ABORTED', async () => {
    const controller = new AbortController();
    models.generateContentStream.mockResolvedValueOnce(
      (async function* () {
        yield { text: 'partial' };
        controller.abort();
        throw Object.assign(new Error('aborted'), { name: 'AbortError' });
      })()
    );

    const error = await collect(streamText(PROMPT, makeCtx(controller.signal))).catch(e => e);
    expect(error).toBeInstanceOf(AIError);
    expect(error.code).toBe('ABORTED');
  });
});

describe('prompt plumbing and thinking levels', () => {
  it('sends the system instruction separately and records both parts in telemetry', async () => {
    models.generateContent.mockResolvedValueOnce(reply('{"score": 10, "tags": []}'));
    const ctx = makeCtx();

    await generateStructured(PROMPT, schema, ctx);

    const call = models.generateContent.mock.calls[0][0];
    expect(call.contents).toBe('prompt');
    expect(call.config.systemInstruction).toBe(PROMPT.system);
    expect(ctx.tracker.snapshot().prompts).toEqual([{ system: PROMPT.system, user: 'prompt' }]);
  });

  it('applies the operation thinking level', async () => {
    models.generateContent.mockResolvedValueOnce(reply('{"score": 10, "tags": []}'));

    await generateStructured(PROMPT, schema, { ...makeCtx(), thinkingLevel: 'LOW' });

    expect(models.generateContent.mock.calls[0][0].config.thinkingConfig).toEqual({ thinkingLevel: 'LOW' });
  });

  it('retries the same model without thinking when the level is unsupported', async () => {
    models.generateContent
      .mockRejectedValueOnce(new ApiError({ message: 'Thinking level MINIMAL is not supported for this model.', status: 400 }))
      .mockResolvedValueOnce(reply('{"score": 10, "tags": []}'));
    const tracker = new TelemetryTracker({ requestId: 'r', operation: 'test', context: {}, thinkingLevel: 'MINIMAL' });

    await generateStructured(PROMPT, schema, { tracker, signal: new AbortController().signal, thinkingLevel: 'MINIMAL' });

    const [first, second] = models.generateContent.mock.calls.map(c => c[0]);
    expect(first.model).toBe(second.model);
    expect(first.config.thinkingConfig).toBeDefined();
    expect(second.config.thinkingConfig).toBeUndefined();
    expect(tracker.snapshot().thinkingLevel).toBe(`MINIMAL → default (unsupported by ${env.GEMINI_MODELS[0]})`);
    expect(tracker.snapshot().attempts).toEqual([{ model: env.GEMINI_MODELS[0], ok: true }]);
  });

  it('does not swallow unrelated 400s', async () => {
    models.generateContent.mockRejectedValue(new ApiError({ message: 'Invalid JSON payload', status: 400 }));

    await expect(generateStructured(PROMPT, schema, { ...makeCtx(), thinkingLevel: 'LOW' })).rejects.toMatchObject({ code: 'UPSTREAM' });
    expect(models.generateContent).toHaveBeenCalledTimes(1);
  });
});

describe('semanticAnalysis', () => {
  // Toy embedding: one dimension per concept, so similarities are predictable
  const CONCEPTS = ['react', 'docker', 'mentor'];
  const embed = (text: string) => [...CONCEPTS.map(c => (text.toLowerCase().includes(c) ? 1 : 0)), 0.1];

  it('matches requirements against individual resume lines and returns evidence', async () => {
    models.generateContent.mockResolvedValueOnce(reply('{"requirements": ["React", "Mentoring", "Docker"]}'));
    models.embedContent.mockImplementation(async ({ contents }: { contents: { parts: { text: string }[] }[] }) => ({
      embeddings: contents.map(c => ({ values: embed(c.parts[0].text) })),
    }));
    const ctx = makeCtx();

    const resume = [
      'Experience',
      '- Built React apps for five years at Acme Corp',
      '- Mentored four junior engineers through promotion',
      'Skills',
      'TypeScript, GraphQL, Jest, CI/CD pipelines',
    ].join('\n');
    const result = await semanticAnalysis(resume, 'Senior engineer: React, Docker and mentoring', ctx);

    // One batch for JD + sections + evidence lines, one for requirements
    expect(models.embedContent).toHaveBeenCalledTimes(2);
    const firstBatch = models.embedContent.mock.calls[0][0].contents;
    expect(firstBatch[0]).toEqual({ role: 'user', parts: [{ text: 'Senior engineer: React, Docker and mentoring' }] });
    expect(result.evidenceChunks).toBe(3);
    expect(result.sections.map(s => s.name)).toEqual(['Experience', 'Skills']);

    const byReq = Object.fromEntries(result.requirementCoverage.map(r => [r.requirement, r]));
    expect(byReq.React).toMatchObject({ covered: true, bestSection: 'Experience', evidence: 'Built React apps for five years at Acme Corp' });
    expect(byReq.Mentoring).toMatchObject({ covered: true, evidence: 'Mentored four junior engineers through promotion' });
    expect(byReq.Docker.covered).toBe(false);
    expect(result.topGaps).toEqual(['Docker']);
    expect(result.calibration).toMatchObject({ model: env.EMBEDDING_MODEL, coveredThreshold: 50 });
    expect(ctx.tracker.snapshot().embeddings).toEqual({ model: env.EMBEDDING_MODEL, calls: 2, inputs: firstBatch.length + 3 });
  });
});

describe('timeouts', () => {
  const abortError = () => Object.assign(new Error('This operation was aborted'), { name: 'AbortError' });
  // A stream that never yields — like a queued model — and rejects once its signal aborts.
  const hangingStream = (signal: AbortSignal) =>
    (async function* () {
      await new Promise((_, reject) => signal.addEventListener('abort', () => reject(abortError()), { once: true }));
      yield { text: 'never' };
    })();

  it('falls back to the next model when a request/response call times out', async () => {
    models.generateContent.mockRejectedValueOnce(abortError()).mockResolvedValueOnce(reply('{"score": 1, "tags": []}'));
    const ctx = makeCtx();

    await generateStructured(PROMPT, schema, ctx);

    expect(ctx.tracker.snapshot().attempts).toEqual([
      { model: env.GEMINI_MODELS[0], ok: false, error: 'timed out' },
      { model: env.GEMINI_MODELS[1], ok: true },
    ]);
  });

  it('abandons a stream that produces no first token and falls back', async () => {
    const original = env.LLM_FIRST_TOKEN_TIMEOUT_MS;
    env.LLM_FIRST_TOKEN_TIMEOUT_MS = 30;
    try {
      models.generateContentStream
        .mockImplementationOnce(async ({ config }: { config: { abortSignal: AbortSignal } }) => hangingStream(config.abortSignal))
        .mockResolvedValueOnce((async function* () { yield { text: 'from fallback' }; })());
      const ctx = makeCtx();

      await expect(collect(streamText(PROMPT, ctx))).resolves.toEqual(['from fallback']);
      expect(ctx.tracker.snapshot().attempts.map(a => a.ok)).toEqual([false, true]);
    } finally {
      env.LLM_FIRST_TOKEN_TIMEOUT_MS = original;
    }
  });

  it('does not time out a stream that pauses after its first token', async () => {
    const original = env.LLM_FIRST_TOKEN_TIMEOUT_MS;
    env.LLM_FIRST_TOKEN_TIMEOUT_MS = 30;
    try {
      models.generateContentStream.mockResolvedValueOnce(
        (async function* () {
          yield { text: 'first ' };
          await new Promise(r => setTimeout(r, 80)); // longer than the first-token deadline
          yield { text: 'second' };
        })()
      );
      const ctx = makeCtx();

      await expect(collect(streamText(PROMPT, ctx))).resolves.toEqual(['first ', 'second']);
      expect(ctx.tracker.snapshot().attempts).toHaveLength(1);
    } finally {
      env.LLM_FIRST_TOKEN_TIMEOUT_MS = original;
    }
  });

  it('reports TIMEOUT when every model times out', async () => {
    models.generateContent.mockRejectedValue(abortError());

    await expect(generateStructured(PROMPT, schema, makeCtx())).rejects.toMatchObject({ code: 'TIMEOUT', status: 504 });
    expect(models.generateContent).toHaveBeenCalledTimes(env.GEMINI_MODELS.length);
  });

  it('sets per-call timeouts: short for request/response, long for streams', async () => {
    models.generateContent.mockResolvedValueOnce(reply('{"score": 1, "tags": []}'));
    models.generateContentStream.mockResolvedValueOnce((async function* () { yield { text: 'x' }; })());

    await generateStructured(PROMPT, schema, makeCtx());
    await collect(streamText(PROMPT, makeCtx()));

    expect(models.generateContent.mock.calls[0][0].config.httpOptions).toEqual({ timeout: env.LLM_TIMEOUT_MS });
    expect(models.generateContentStream.mock.calls[0][0].config.httpOptions).toEqual({ timeout: env.LLM_STREAM_TIMEOUT_MS });
  });
});

describe('error messages', () => {
  it('hides configuration details from users in production', async () => {
    const original = env.NODE_ENV;
    models.generateContent.mockRejectedValue(new ApiError({ message: 'API key not valid', status: 400 }));
    try {
      env.NODE_ENV = 'production';
      const prod = await generateStructured(PROMPT, schema, makeCtx()).catch(e => e);
      expect(prod).toMatchObject({ code: 'AUTH', message: 'The AI service is not configured correctly. Please try again later.' });

      env.NODE_ENV = 'development';
      const dev = await generateStructured(PROMPT, schema, makeCtx()).catch(e => e);
      expect(dev.message).toMatch(/GEMINI_API_KEY/);
    } finally {
      env.NODE_ENV = original;
    }
  });
});
