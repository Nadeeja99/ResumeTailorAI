import type { AIResult, RequestOptions } from '@/types/ai';
import { postAI, streamAI } from './aiClient';

export { ApiError, isAbortError, isUsageLimitError } from './aiClient';

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
  return postAI('/analyze', { resume, jobDescription }, opts);
}

// ── Improved resume (streaming) ───────────────────────────────────────────────

export function generateImprovedResume(
  resume: string,
  jobDescription: string,
  suggestions: string[],
  onChunk: (chunk: string) => void,
  opts?: RequestOptions
): Promise<AIResult<string>> {
  return streamAI('/generate-improved', { resume, jobDescription, suggestions }, onChunk, opts);
}

// ── Cover letter (streaming) ──────────────────────────────────────────────────

export function generateCoverLetter(
  resume: string,
  jobDescription: string,
  applicantName: string,
  onChunk: (chunk: string) => void,
  opts?: RequestOptions
): Promise<AIResult<string>> {
  return streamAI('/generate-cover-letter', { resume, jobDescription, applicantName }, onChunk, opts);
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
  return postAI('/compare-jobs', { resume, jobDescriptions }, opts);
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
}

export interface SemanticAnalysisResult {
  overallScore: number;
  sections: SemanticSection[];
  requirementCoverage: SemanticRequirement[];
  topGaps: string[];
  embeddingModel: string;
}

export function semanticAnalyze(
  resume: string,
  jobDescription: string,
  opts?: RequestOptions
): Promise<AIResult<SemanticAnalysisResult>> {
  return postAI('/semantic-analysis', { resume, jobDescription }, opts);
}

// ── LinkedIn PDF parsing ──────────────────────────────────────────────────────

export function parseLinkedIn(rawText: string, opts?: RequestOptions): Promise<AIResult<{ resume: string }>> {
  return postAI('/parse-linkedin', { rawText }, opts);
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
  return postAI('/interview-prep', { resume, jobDescription }, opts);
}
