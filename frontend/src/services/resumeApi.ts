const API_BASE = '/api';

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

// Consume an SSE stream and call onChunk for every piece of text.
// Returns the full assembled text.
async function streamSSE(
  path: string,
  body: unknown,
  onChunk: (chunk: string) => void
): Promise<string> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok || !res.body) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error || `Request failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (payload === '[DONE]') return full;

      let parsed: any;
      try {
        parsed = JSON.parse(payload);
      } catch {
        continue; // skip genuinely malformed JSON lines
      }

      if (parsed.error) throw new Error(parsed.error); // propagate backend errors
      if (parsed.chunk) {
        full += parsed.chunk;
        onChunk(parsed.chunk);
      }
    }
  }
  return full;
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
  return post('/analyze', { resume, jobDescription });
}

// ── Improved resume (streaming) ───────────────────────────────────────────────

export function generateImprovedResume(
  resume: string,
  jobDescription: string,
  suggestions: string[],
  onChunk: (chunk: string) => void
): Promise<string> {
  return streamSSE('/generate-improved', { resume, jobDescription, suggestions }, onChunk);
}

// ── Cover letter (streaming) ──────────────────────────────────────────────────

export function generateCoverLetter(
  resume: string,
  jobDescription: string,
  applicantName: string,
  onChunk: (chunk: string) => void
): Promise<string> {
  return streamSSE('/generate-cover-letter', { resume, jobDescription, applicantName }, onChunk);
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
  return post('/compare-jobs', { resume, jobDescriptions });
}

// ── Semantic analysis ─────────────────────────────────────────────────────────

export interface SemanticSection {
  name: string;
  score: number;
  excerpt: string;
}

export interface SemanticRequirement {
  requirement: string;
  covered: boolean;
  score: number;
}

export interface SemanticAnalysisResult {
  overallScore: number;
  sections: SemanticSection[];
  requirementCoverage: SemanticRequirement[];
  topGaps: string[];
}

export function semanticAnalyze(
  resume: string,
  jobDescription: string
): Promise<SemanticAnalysisResult> {
  return post('/semantic-analysis', { resume, jobDescription });
}

// ── LinkedIn PDF parsing ──────────────────────────────────────────────────────

export async function parseLinkedIn(rawText: string): Promise<string> {
  const data = await post<{ resume: string }>('/parse-linkedin', { rawText });
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
  return post('/interview-prep', { resume, jobDescription });
}

// Legacy class export so existing Index.tsx import still works
export class GeminiService {
  static isInitialized() { return true; }
  static analyzeResume(resume: string, jd: string) { return analyzeResume(resume, jd); }
  static generateImprovedResume(resume: string, jd: string, suggestions: string[], onChunk = (_c: string) => {}) {
    return generateImprovedResume(resume, jd, suggestions, onChunk);
  }
}
