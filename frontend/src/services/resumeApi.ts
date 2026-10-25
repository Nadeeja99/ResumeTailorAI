import type { AIResponse, SSEEvent, StreamResult } from '@/types/ai';

const API_BASE = '/api';

async function readError(res: Response): Promise<Error> {
  const err = (await res.json().catch(() => ({}))) as { error?: string };
  return new Error(err.error || `Request failed (${res.status})`);
}

// AI endpoints respond with `{ data, telemetry }`.
async function post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<AIResponse<T>> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) throw await readError(res);
  return res.json() as Promise<AIResponse<T>>;
}

// Consume an SSE v2 stream (meta → chunk* → done | error), calling onChunk for every piece of text.
async function streamSSE(
  path: string,
  body: unknown,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal
): Promise<StreamResult> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok || !res.body) throw await readError(res);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue; // also skips `: ping` heartbeats

      let event: SSEEvent;
      try {
        event = JSON.parse(line.slice(6));
      } catch {
        continue; // skip genuinely malformed JSON lines
      }

      if (event.type === 'chunk') {
        text += event.text;
        onChunk(event.text);
      } else if (event.type === 'done') {
        return { text, telemetry: event.telemetry };
      } else if (event.type === 'error') {
        throw new Error(event.error);
      }
    }
  }
  throw new Error('The connection closed before the response finished. Please try again.');
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

export function analyzeResume(resume: string, jobDescription: string): Promise<AnalysisResult> {
  return post<AnalysisResult>('/analyze', { resume, jobDescription }).then(r => r.data);
}

// ── Improved resume (streaming) ───────────────────────────────────────────────

export function generateImprovedResume(
  resume: string,
  jobDescription: string,
  suggestions: string[],
  onChunk: (chunk: string) => void
): Promise<string> {
  return streamSSE('/generate-improved', { resume, jobDescription, suggestions }, onChunk).then(r => r.text);
}

// ── Cover letter (streaming) ──────────────────────────────────────────────────

export function generateCoverLetter(
  resume: string,
  jobDescription: string,
  applicantName: string,
  onChunk: (chunk: string) => void
): Promise<string> {
  return streamSSE('/generate-cover-letter', { resume, jobDescription, applicantName }, onChunk).then(r => r.text);
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
  jobDescriptions: JobComparisonJob[]
): Promise<{ results: JobComparisonResult[] }> {
  return post<{ results: JobComparisonResult[] }>('/compare-jobs', { resume, jobDescriptions }).then(r => r.data);
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
  jobDescription: string
): Promise<SemanticAnalysisResult> {
  return post<SemanticAnalysisResult>('/semantic-analysis', { resume, jobDescription }).then(r => r.data);
}

// ── LinkedIn PDF parsing ──────────────────────────────────────────────────────

export async function parseLinkedIn(rawText: string): Promise<string> {
  const { data } = await post<{ resume: string }>('/parse-linkedin', { rawText });
  return data.resume;
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
  jobDescription: string
): Promise<InterviewPrepResult> {
  return post<InterviewPrepResult>('/interview-prep', { resume, jobDescription }).then(r => r.data);
}
