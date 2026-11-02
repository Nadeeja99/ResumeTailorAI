import type { AIResult, RequestOptions } from '@/types/ai';
import { redactContactDetails, restoreDeep, restoringStream, type Redaction } from '@/lib/redaction';
import { postAI, streamAI } from './aiClient';

export { ApiError, isAbortError, isUsageLimitError } from './aiClient';

// Resumes go out with contact details replaced by placeholders (lib/redaction); results come back restored.
function postRedacted<T>(path: string, redaction: Redaction, body: object, opts?: RequestOptions): Promise<AIResult<T>> {
  return postAI<T>(path, body, opts).then(result => ({ ...result, data: restoreDeep(result.data, redaction.restore) }));
}

function streamRedacted(
  path: string,
  redaction: Redaction,
  body: object,
  onChunk: (chunk: string) => void,
  opts?: RequestOptions
): Promise<AIResult<string>> {
  const stream = restoringStream(onChunk, redaction);
  return streamAI(path, body, stream.onChunk, opts).then(
    result => ({ ...result, data: redaction.restore(result.data) }),
    error => {
      stream.flush(); // keep the partial text complete
      throw error;
    }
  );
}

// ── Analysis ─────────────────────────────────────────────────────────────────

export interface AnalysisResult {
  matchScore: number;
  missingKeywords: string[];
  suggestedImprovements: string[];
  strengths: string[];
  toneAnalysis: { score: number; feedback: string };
  atsOptimization: { score: number; suggestions: string[] };
}

export function analyzeResume(resume: string, jobDescription: string, opts?: RequestOptions): Promise<AIResult<AnalysisResult>> {
  const r = redactContactDetails(resume);
  return postRedacted('/analyze', r, { resume: r.text, jobDescription }, opts);
}

// ── Improved resume (streaming) ───────────────────────────────────────────────

export function generateImprovedResume(
  resume: string,
  jobDescription: string,
  suggestions: string[],
  onChunk: (chunk: string) => void,
  opts?: RequestOptions
): Promise<AIResult<string>> {
  const r = redactContactDetails(resume);
  return streamRedacted('/generate-improved', r, { resume: r.text, jobDescription, suggestions }, onChunk, opts);
}

// ── Cover letter (streaming) ──────────────────────────────────────────────────

export function generateCoverLetter(
  resume: string,
  jobDescription: string,
  applicantName: string,
  onChunk: (chunk: string) => void,
  opts?: RequestOptions
): Promise<AIResult<string>> {
  const r = redactContactDetails(resume);
  return streamRedacted('/generate-cover-letter', r, { resume: r.text, jobDescription, applicantName }, onChunk, opts);
}

// ── Job comparison ────────────────────────────────────────────────────────────

export interface JobComparisonJob {
  id: string;
  title: string;
  description: string;
}

export interface JobComparisonResult {
  id: string;
  title: string;
  matchScore: number;
  missingKeywords: string[];
  strengths: string[];
  topSuggestion: string;
}

export function compareJobs(
  resume: string,
  jobDescriptions: JobComparisonJob[],
  opts?: RequestOptions
): Promise<AIResult<{ results: JobComparisonResult[] }>> {
  const r = redactContactDetails(resume);
  return postRedacted('/compare-jobs', r, { resume: r.text, jobDescriptions }, opts);
}

// ── Semantic analysis ─────────────────────────────────────────────────────────

export interface SemanticSection {
  name: string;
  score: number;
  rawSimilarity: number;
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
  /** Resume line that best supports (or fails to support) the requirement. */
  evidence: string;
  /** Distinctive requirement terms found in the resume (lexical half of hybrid matching). */
  matchedTerms: string[];
}

export interface SemanticCalibration {
  model: string;
  floor: number;
  range: number;
  coveredThreshold: number;
  strongSimilarity: number;
}

export interface SemanticAnalysisResult {
  overallScore: number;
  sections: SemanticSection[];
  requirementCoverage: SemanticRequirement[];
  topGaps: string[];
  embeddingModel: string;
  calibration: SemanticCalibration;
  evidenceChunks: number;
}

export function semanticAnalyze(
  resume: string,
  jobDescription: string,
  opts?: RequestOptions
): Promise<AIResult<SemanticAnalysisResult>> {
  const r = redactContactDetails(resume);
  return postRedacted('/semantic-analysis', r, { resume: r.text, jobDescription }, opts);
}

// ── LinkedIn PDF parsing ──────────────────────────────────────────────────────

export function parseLinkedIn(rawText: string, opts?: RequestOptions): Promise<AIResult<{ resume: string }>> {
  const r = redactContactDetails(rawText);
  return postRedacted('/parse-linkedin', r, { rawText: r.text }, opts);
}

// ── Interview prep ────────────────────────────────────────────────────────────

export interface InterviewQuestion {
  id: number;
  question: string;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  whyAsked: string;
  idealAnswer: string;
  tips: string[];
}

export interface InterviewPrepResult {
  roleTitle: string;
  questions: InterviewQuestion[];
}

export function generateInterviewPrep(
  resume: string,
  jobDescription: string,
  opts?: RequestOptions
): Promise<AIResult<InterviewPrepResult>> {
  const r = redactContactDetails(resume);
  return postRedacted('/interview-prep', r, { resume: r.text, jobDescription }, opts);
}
