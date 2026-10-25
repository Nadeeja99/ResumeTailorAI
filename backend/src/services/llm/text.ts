import type { GenerateContentResponse } from '@google/genai';
import { aborted, toAIError } from './errors.js';
import { baseConfig, emptyResponseError, getClient, responseMeta, withModelFallback, type CallContext } from './client.js';

export async function generateText(prompt: string, ctx: CallContext): Promise<string> {
  ctx.tracker.recordPrompt(prompt);
  return withModelFallback(ctx, async model => {
    const response = await getClient().models.generateContent({ model, contents: prompt, config: baseConfig(ctx.signal) });
    ctx.tracker.recordResponse(responseMeta(model, response));
    const text = response.text?.trim();
    if (!text) throw emptyResponseError(response);
    return text;
  });
}

// Fallback only applies until the stream opens — switching models mid-stream would duplicate output.
export async function* streamText(prompt: string, ctx: CallContext): AsyncGenerator<string> {
  ctx.tracker.recordPrompt(prompt);
  const { model, stream } = await withModelFallback(ctx, async model => ({
    model,
    stream: await getClient().models.generateContentStream({ model, contents: prompt, config: baseConfig(ctx.signal) }),
  }));

  let last: GenerateContentResponse | undefined;
  let usage: GenerateContentResponse['usageMetadata'];
  let produced = false;
  try {
    for await (const chunk of stream) {
      last = chunk;
      usage = chunk.usageMetadata ?? usage;
      const text = chunk.text;
      if (text) {
        produced = true;
        ctx.tracker.markFirstToken();
        yield text;
      }
    }
  } catch (error) {
    throw ctx.signal.aborted ? aborted() : toAIError(error);
  } finally {
    ctx.tracker.recordResponse({ ...responseMeta(model, last), usage });
  }
  if (!produced) throw emptyResponseError(last);
}
