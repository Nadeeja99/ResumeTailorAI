import type { GenerateContentResponse } from '@google/genai';
import { env } from '../../config/env.js';
import type { PromptParts } from '../../prompts/index.js';
import { aborted, toAIError } from './errors.js';
import {
  callWithConfig, deadlineSignal, emptyResponseError, getClient, responseMeta, withModelFallback, type CallContext,
} from './client.js';

export async function generateText(prompt: PromptParts, ctx: CallContext): Promise<string> {
  ctx.tracker.recordPrompt(prompt);
  return withModelFallback(ctx, async model => {
    const response = await callWithConfig(ctx, model, prompt, config =>
      getClient().models.generateContent({ model, contents: prompt.user, config })
    );
    ctx.tracker.recordResponse(responseMeta(model, response));
    const text = response.text?.trim();
    if (!text) throw emptyResponseError(response);
    return text;
  });
}

/**
 * Streams text with model fallback. The first chunk is awaited *inside* the fallback loop under a
 * first-token deadline: a queued/hung model is abandoned for the next one, which is safe because
 * nothing has reached the user yet. After that, only the total stream cap applies.
 */
export async function* streamText(prompt: PromptParts, ctx: CallContext): AsyncGenerator<string> {
  ctx.tracker.recordPrompt(prompt);

  const opened = await withModelFallback(ctx, async model => {
    const deadline = deadlineSignal(ctx.signal, env.LLM_FIRST_TOKEN_TIMEOUT_MS);
    try {
      const stream = await callWithConfig(
        { ...ctx, signal: deadline.signal },
        model,
        prompt,
        config => getClient().models.generateContentStream({ model, contents: prompt.user, config }),
        { httpOptions: { timeout: env.LLM_STREAM_TIMEOUT_MS } }
      );
      const iterator = stream[Symbol.asyncIterator]();
      const first = await iterator.next();
      return { model, iterator, first };
    } finally {
      deadline.clear(); // first chunk arrived (or failed): stop the watchdog, keep the client-abort link
    }
  });

  const { model, iterator } = opened;
  let next = opened.first;
  let last: GenerateContentResponse | undefined;
  let usage: GenerateContentResponse['usageMetadata'];
  let produced = false;
  try {
    while (!next.done) {
      const chunk = next.value;
      last = chunk;
      usage = chunk.usageMetadata ?? usage;
      const text = chunk.text;
      if (text) {
        produced = true;
        ctx.tracker.markFirstToken();
        yield text;
      }
      next = await iterator.next();
    }
  } catch (error) {
    throw ctx.signal.aborted ? aborted() : toAIError(error);
  } finally {
    ctx.tracker.recordResponse({ ...responseMeta(model, last), usage });
  }
  if (!produced) throw emptyResponseError(last);
}
