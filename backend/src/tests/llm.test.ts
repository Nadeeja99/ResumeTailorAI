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

    await expect(generateStructured('prompt', schema, ctx)).resolves.toEqual({ score: 80, tags: ['a'] });

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

    await expect(generateStructured('prompt', schema, ctx)).resolves.toEqual({ score: 100, tags: ['a'] });

    const repairPrompt: string = models.generateContent.mock.calls[1][0].contents;
    expect(repairPrompt).toContain('score:');
    expect(ctx.tracker.snapshot()).toMatchObject({ schema: 'repaired', calls: 2, usage: { totalTokens: 30 } });
    expect(ctx.tracker.snapshot().prompts).toHaveLength(2);
  });

  it('fails with INVALID_OUTPUT when repair also fails', async () => {
    models.generateContent.mockResolvedValue(reply('not json'));
    const ctx = makeCtx();

    await expect(generateStructured('prompt', schema, ctx)).rejects.toMatchObject({ code: 'INVALID_OUTPUT', status: 502 });
    expect(ctx.tracker.snapshot().schema).toBe('failed');
  });

  it('falls back to the next model when a model is unavailable', async () => {
    models.generateContent
      .mockRejectedValueOnce(new ApiError({ message: 'model not found', status: 404 }))
      .mockResolvedValueOnce(reply('{"score": 50, "tags": []}'));
    const ctx = makeCtx();

    await generateStructured('prompt', schema, ctx);

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

    await generateStructured('prompt', schema, ctx);

    expect(ctx.tracker.snapshot().attempts[0]).toEqual({
      model: env.GEMINI_MODELS[0],
      ok: false,
      status: 503,
      error: 'This model is currently experiencing high demand.',
    });
  });

  it('does not fall back on auth errors', async () => {
    models.generateContent.mockRejectedValue(new ApiError({ message: 'API key not valid', status: 400 }));

    await expect(generateStructured('prompt', schema, makeCtx())).rejects.toMatchObject({ code: 'AUTH' });
    expect(models.generateContent).toHaveBeenCalledTimes(1);
  });

  it('reports ABORTED when the client signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(generateStructured('prompt', schema, makeCtx(controller.signal))).rejects.toMatchObject({ code: 'ABORTED' });
    expect(models.generateContent).not.toHaveBeenCalled();
  });

  it('omits prompts from telemetry when EXPOSE_PROMPTS is off', async () => {
    env.EXPOSE_PROMPTS = false;
    models.generateContent.mockResolvedValueOnce(reply('{"score": 1, "tags": []}'));
    const ctx = makeCtx();

    await generateStructured('secret resume', schema, ctx);

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

    await expect(collect(streamText('prompt', ctx))).resolves.toEqual(['Hello', ' world']);

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

    await expect(collect(streamText('prompt', makeCtx()))).rejects.toMatchObject({ code: 'BLOCKED' });
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

    const error = await collect(streamText('prompt', makeCtx(controller.signal))).catch(e => e);
    expect(error).toBeInstanceOf(AIError);
    expect(error.code).toBe('ABORTED');
  });
});

describe('semanticAnalysis', () => {
  it('uses two batched embedding calls and returns inspectable chunks', async () => {
    models.generateContent.mockResolvedValueOnce(reply('{"requirements": ["React", "Docker"]}'));
    // [JD, experience, skills] then [React, Docker]
    models.embedContent
      .mockResolvedValueOnce({ embeddings: [{ values: [1, 0] }, { values: [0.9, 0.1] }, { values: [0.6, 0.8] }] })
      .mockResolvedValueOnce({ embeddings: [{ values: [1, 0] }, { values: [0, 1] }] });
    const ctx = makeCtx();

    const resume = 'Experience\nBuilt React apps for five years at Acme.\nSkills\nTypeScript, Docker, Kubernetes, AWS.';
    const result = await semanticAnalysis(resume, 'Senior engineer with React and Docker experience', ctx);

    expect(models.embedContent).toHaveBeenCalledTimes(2);
    const firstBatch = models.embedContent.mock.calls[0][0].contents;
    expect(firstBatch).toHaveLength(3);
    expect(firstBatch[0]).toEqual({ role: 'user', parts: [{ text: 'Senior engineer with React and Docker experience' }] });
    expect(result.sections.map(s => s.name)).toEqual(['Experience', 'Skills']);
    expect(result.sections[0]).toMatchObject({ rawSimilarity: 0.994, score: 100 });
    expect(result.requirementCoverage).toEqual([
      expect.objectContaining({ requirement: 'React', bestSection: 'Experience', covered: true }),
      expect.objectContaining({ requirement: 'Docker', bestSection: 'Skills', covered: true }),
    ]);
    expect(ctx.tracker.snapshot().embeddings).toEqual({ model: env.EMBEDDING_MODEL, calls: 2, inputs: 5 });
  });
});
