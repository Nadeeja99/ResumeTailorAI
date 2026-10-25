import { env } from '../config/env.js';
import { extractRequirementsPrompt } from '../prompts/index.js';
import { jdRequirementsOutputSchema } from '../schemas/ai.js';
import { getClient, type CallContext } from './llm/client.js';
import { AIError, aborted, toAIError } from './llm/errors.js';
import { generateStructured } from './llm/structured.js';
import { calibrationFor, toScore, type Calibration } from './semantic/calibration.js';
import { buildEvidenceChunks, extractResumeSections } from './semantic/chunking.js';
import { keywordMatcher } from './semantic/lexical.js';

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

const round3 = (n: number) => Math.round(n * 1000) / 1000;

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
  /** The resume line that best supports (or fails to support) this requirement. */
  evidence: string;
  /** Distinctive requirement terms found anywhere in the resume (lexical half of hybrid matching). */
  matchedTerms: string[];
}

export interface SemanticAnalysisResult {
  overallScore: number; // 0-100 average of section scores
  sections: SemanticSection[];
  requirementCoverage: SemanticRequirement[];
  topGaps: string[];
  embeddingModel: string;
  calibration: Calibration;
  evidenceChunks: number;
}

export async function semanticAnalysis(
  resume: string,
  jobDescription: string,
  ctx: CallContext
): Promise<SemanticAnalysisResult> {
  const calibration = calibrationFor(env.EMBEDDING_MODEL);
  const sections = extractResumeSections(resume);
  const sectionNames = Object.keys(sections);
  const evidence = buildEvidenceChunks(sections);

  // Two batched embedding calls; requirement extraction runs alongside the first
  const [vectors, { requirements }] = await Promise.all([
    embedMany([jobDescription, ...Object.values(sections), ...evidence.map(e => e.text)], ctx),
    generateStructured(extractRequirementsPrompt(jobDescription), jdRequirementsOutputSchema, ctx),
  ]);
  const [jdEmbedding, ...rest] = vectors;
  const sectionEmbeddings = rest.slice(0, sectionNames.length);
  const evidenceEmbeddings = rest.slice(sectionNames.length);
  const requirementEmbeddings = await embedMany(requirements, ctx);

  const sectionResults: SemanticSection[] = sectionNames.map((name, i) => {
    const similarity = cosineSimilarity(sectionEmbeddings[i], jdEmbedding);
    const text = sections[name];
    return {
      name,
      score: toScore(similarity, calibration),
      rawSimilarity: round3(similarity),
      chars: text.length,
      excerpt: text.slice(0, 120) + (text.length > 120 ? '…' : ''),
      text,
    };
  });

  // Match each requirement against individual resume lines (falling back to whole sections)
  const candidates = evidence.length > 0
    ? evidence.map((e, i) => ({ section: e.section, text: e.text, vector: evidenceEmbeddings[i] }))
    : sectionNames.map((name, i) => ({ section: name, text: sections[name], vector: sectionEmbeddings[i] }));

  const matchTerms = keywordMatcher(resume);
  const requirementCoverage: SemanticRequirement[] = requirements.map((requirement, i) => {
    let best = { similarity: -1, candidate: candidates[0] };
    for (const candidate of candidates) {
      const similarity = cosineSimilarity(candidate.vector, requirementEmbeddings[i]);
      if (similarity > best.similarity) best = { similarity, candidate };
    }
    const score = toScore(best.similarity, calibration);
    const matchedTerms = matchTerms(requirement);
    // Hybrid rule: semantically close AND a distinctive term present — unless the semantic match alone is strong
    const covered =
      score >= calibration.coveredThreshold && (matchedTerms.length > 0 || best.similarity >= calibration.strongSimilarity);
    return {
      requirement,
      covered,
      matchedTerms,
      score,
      rawSimilarity: round3(best.similarity),
      bestSection: best.candidate.section,
      evidence: best.candidate.text.slice(0, 300),
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

  return {
    overallScore,
    sections: sectionResults,
    requirementCoverage,
    topGaps,
    embeddingModel: env.EMBEDDING_MODEL,
    calibration,
    evidenceChunks: evidence.length,
  };
}
