import { z } from 'zod';
import { logger } from '../../lib/logger.js';
import { AIError } from './errors.js';
import type { PromptParts } from '../../prompts/index.js';
import { callWithConfig, getClient, responseMeta, withModelFallback, type CallContext } from './client.js';

const jsonSchemaCache = new WeakMap<z.ZodType, unknown>();

// Gemini accepts a subset of JSON Schema; drop the `$schema` dialect marker it doesn't list.
function responseJsonSchema(schema: z.ZodType): unknown {
  let cached = jsonSchemaCache.get(schema);
  if (!cached) {
    const { $schema: _dialect, ...rest } = z.toJSONSchema(schema) as Record<string, unknown>;
    cached = rest;
    jsonSchemaCache.set(schema, cached);
  }
  return cached;
}

type Validation<T> = { ok: true; data: T } | { ok: false; issues: string[] };

function validate<T>(schema: z.ZodType<T>, text: string | undefined): Validation<T> {
  let parsed: unknown;
  try {
    // Tolerate a stray ```json fence even in JSON mode
    parsed = JSON.parse((text ?? '').trim().replace(/^```(?:json)?\s*|\s*```$/g, ''));
  } catch {
    return { ok: false, issues: ['Output is not valid JSON (it may be truncated).'] };
  }
  const result = schema.safeParse(parsed);
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, issues: result.error.issues.map(i => `${i.path.join('.') || '(root)'}: ${i.message}`) };
}

function repairPrompt(original: PromptParts, previous: string | undefined, issues: string[]): PromptParts {
  return {
    system: original.system,
    user: `The JSON below failed validation against the required schema.
Fix ONLY the listed problems, keep all other content unchanged, and return the corrected JSON.

PROBLEMS:
${issues.map(i => `- ${i}`).join('\n')}

JSON:
${previous ?? ''}`,
  };
}

// Schema-constrained generation with Zod validation and a single repair round-trip.
export async function generateStructured<T>(prompt: PromptParts, schema: z.ZodType<T>, ctx: CallContext): Promise<T> {
  const jsonConfig = { responseMimeType: 'application/json', responseJsonSchema: responseJsonSchema(schema) };

  return withModelFallback(ctx, async model => {
    const call = async (parts: PromptParts) => {
      ctx.tracker.recordPrompt(parts);
      const response = await callWithConfig(
        ctx,
        model,
        parts,
        config => getClient().models.generateContent({ model, contents: parts.user, config }),
        jsonConfig
      );
      ctx.tracker.recordResponse(responseMeta(model, response));
      return response.text;
    };

    const first = await call(prompt);
    const initial = validate(schema, first);
    if (initial.ok) {
      ctx.tracker.recordSchema('valid');
      return initial.data;
    }

    const repaired = validate(schema, await call(repairPrompt(prompt, first, initial.issues)));
    if (repaired.ok) {
      ctx.tracker.recordSchema('repaired');
      return repaired.data;
    }

    ctx.tracker.recordSchema('failed');
    logger.warn('llm.invalid_output', { requestId: ctx.tracker.requestId, model, issues: repaired.issues.slice(0, 5) });
    throw new AIError('The model returned output in an unexpected format. Please try again.', 'INVALID_OUTPUT');
  });
}
