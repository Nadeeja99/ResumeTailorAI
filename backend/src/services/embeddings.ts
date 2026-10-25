import { env } from '../config/env.js';
import { extractRequirementsPrompt } from '../prompts/index.js';
import { jdRequirementsOutputSchema } from '../schemas/ai.js';
import { getClient, type CallContext } from './llm/client.js';
import { AIError, aborted, toAIError } from './llm/errors.js';
import { generateStructured } from './llm/structured.js';

// Cosine similarity for related text clusters roughly in [FLOOR, FLOOR + RANGE];
// rescale that band to 0-100. Calibrated on text-embedding-004 — recheck when changing EMBEDDING_MODEL.
const SIMILARITY_FLOOR = 0.5;
const SIMILARITY_RANGE = 0.45;
const COVERED_THRESHOLD = 50;

async function embedMany(texts: string[], ctx: CallContext): Promise<number[][]> {
  if (texts.length === 0) return [];
  try {
    const response = await getClient().models.embedContent({
      model: env.EMBEDDING_MODEL,
      // One Content per text: multimodal models (gemini-embedding-2) merge a bare string[] into a single embedding
      contents: texts.map(text => ({ role: 'user', parts: [{ text }] })),
      config: { abortSignal: ctx.signal },
    });
    const vectors = response.embeddings?.map(e => e.values ?? []) ?? [];
    if (vectors.length !== texts.length || vectors.some(v => v.length === 0)) {
      throw new AIError('The embedding response was incomplete.', 'UPSTREAM');
    }
    ctx.tracker.recordEmbeddings(env.EMBEDDING_MODEL, texts.length);
    return vectors;
  } catch (error) {
    throw ctx.signal.aborted ? aborted() : toAIError(error);
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

const toScore = (similarity: number) =>
  Math.round(Math.min(100, Math.max(0, ((similarity - SIMILARITY_FLOOR) / SIMILARITY_RANGE) * 100)));

const round3 = (n: number) => Math.round(n * 1000) / 1000;

// Splits resume text into named sections heuristically
function extractResumeSections(resume: string): Record<string, string> {
  const SECTION_HEADERS = [
    'summary', 'objective', 'profile',
    'experience', 'work experience', 'employment',
    'education', 'skills', 'technical skills',
    'projects', 'certifications', 'achievements', 'awards',
  ];

  const lines = resume.split('\n');
  const sections: Record<string, string[]> = { intro: [] };
  let current = 'intro';

  for (const line of lines) {
    const lower = line.trim().toLowerCase();
    const matched = SECTION_HEADERS.find(h => lower === h || lower.startsWith(h + ':') || lower.startsWith(h + ' '));
    if (matched) {
      current = matched.split(' ')[0]; // normalise to first word
      sections[current] = sections[current] ?? [];
    } else {
      sections[current] = sections[current] ?? [];
      sections[current].push(line);
    }
  }

  const nonEmpty = Object.fromEntries(
    Object.entries(sections)
      .map(([k, v]) => [k, v.join('\n').trim()])
      .filter(([, v]) => v.length > 20)
  );
  // No recognisable headings → score the resume as a single chunk
  return Object.keys(nonEmpty).length > 0 ? nonEmpty : { resume: resume.trim() };
}

export interface SemanticSection {
  name: string;
  score: number; // 0-100
  rawSimilarity: number; // cosine similarity vs. the full JD
  chars: number;
  excerpt: string;
  text: string;
}

export interface SemanticRequirement {
  requirement: string;
  covered: boolean;
  score: number;
  rawSimilarity: number;
  bestSection: string;
}

export interface SemanticAnalysisResult {
  overallScore: number; // 0-100 average of section scores
  sections: SemanticSection[];
  requirementCoverage: SemanticRequirement[];
  topGaps: string[];
  embeddingModel: string;
}

export async function semanticAnalysis(
  resume: string,
  jobDescription: string,
  ctx: CallContext
): Promise<SemanticAnalysisResult> {
  const sections = extractResumeSections(resume);
  const sectionNames = Object.keys(sections);

  // Two batched embedding calls total; requirement extraction runs alongside the first
  const [[jdEmbedding, ...sectionEmbeddings], { requirements }] = await Promise.all([
    embedMany([jobDescription, ...Object.values(sections)], ctx),
    generateStructured(extractRequirementsPrompt(jobDescription), jdRequirementsOutputSchema, ctx),
  ]);
  const requirementEmbeddings = await embedMany(requirements, ctx);

  const sectionResults: SemanticSection[] = sectionNames.map((name, i) => {
    const similarity = cosineSimilarity(sectionEmbeddings[i], jdEmbedding);
    const text = sections[name];
    return {
      name: name.charAt(0).toUpperCase() + name.slice(1),
      score: toScore(similarity),
      rawSimilarity: round3(similarity),
      chars: text.length,
      excerpt: text.slice(0, 120) + (text.length > 120 ? '…' : ''),
      text,
    };
  });

  const requirementCoverage: SemanticRequirement[] = requirements.map((requirement, i) => {
    // Score each requirement against its best-matching resume section
    let best = -1;
    let bestIndex = 0;
    sectionEmbeddings.forEach((se, j) => {
      const s = cosineSimilarity(se, requirementEmbeddings[i]);
      if (s > best) [best, bestIndex] = [s, j];
    });
    const score = toScore(best);
    return {
      requirement,
      covered: score >= COVERED_THRESHOLD,
      score,
      rawSimilarity: round3(best),
      bestSection: sectionResults[bestIndex].name,
    };
  });

  const overallScore = Math.round(
    sectionResults.reduce((sum, s) => sum + s.score, 0) / (sectionResults.length || 1)
  );

  const topGaps = requirementCoverage
    .filter(r => !r.covered)
    .sort((a, b) => a.score - b.score)
    .slice(0, 5)
    .map(r => r.requirement);

  return { overallScore, sections: sectionResults, requirementCoverage, topGaps, embeddingModel: env.EMBEDDING_MODEL };
}
