import { z } from 'zod';

const PLACEHOLDER_KEYS = new Set(['', 'your_gemini_api_key_here']);

const csv = (fallback: string) =>
  z
    .string()
    .default(fallback)
    .transform(value => value.split(',').map(s => s.trim()).filter(Boolean));

const flag = z
  .enum(['true', 'false', '1', '0'])
  .optional()
  .transform(value => (value === undefined ? undefined : value === 'true' || value === '1'));

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().positive().default(3001),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error', 'silent']).optional(),

    GEMINI_API_KEY: z.string().default('').transform(key => (PLACEHOLDER_KEYS.has(key.trim()) ? '' : key.trim())),
    // Tried in order; later models are used when earlier ones are unavailable or overloaded
    GEMINI_MODELS: csv('gemini-3.8-flash,gemini-3.6-flash,gemini-3.5-flash-lite'),
    EMBEDDING_MODEL: z.string().default('gemini-embedding-2'),
    LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(90_000),
    // Unset = model default. MINIMAL | LOW | MEDIUM | HIGH (Gemini 3.x)
    LLM_THINKING_LEVEL: z.enum(['MINIMAL', 'LOW', 'MEDIUM', 'HIGH']).optional(),
    // Raw prompts contain user resumes and prompt IP — default on only outside production
    EXPOSE_PROMPTS: flag,

    CORS_ORIGINS: csv('http://localhost:8080,http://localhost:5173'),
    // Number of reverse-proxy hops to trust for client IPs (1 behind nginx)
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),
    DATABASE_PATH: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production' && !env.GEMINI_API_KEY) {
      ctx.addIssue({ code: 'custom', path: ['GEMINI_API_KEY'], message: 'is required in production' });
    }
    if (env.GEMINI_MODELS.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['GEMINI_MODELS'], message: 'must list at least one model' });
    }
  })
  .transform(env => ({
    ...env,
    LOG_LEVEL: env.LOG_LEVEL ?? (env.NODE_ENV === 'test' ? 'silent' : 'info'),
    EXPOSE_PROMPTS: env.EXPOSE_PROMPTS ?? env.NODE_ENV !== 'production',
  }));

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  // Treat `FOO=` (e.g. docker-compose `${FOO:-}`) as unset so defaults apply
  const defined = Object.fromEntries(Object.entries(source).filter(([, value]) => value !== ''));
  const result = envSchema.safeParse(defined);
  if (!result.success) {
    const issues = result.error.issues.map(i => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return result.data;
}

export const env = loadEnv();
