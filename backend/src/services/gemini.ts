import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  analyzeResumePrompt,
  compareJobsPrompt,
  generateCoverLetterPrompt,
  generateImprovedResumePrompt,
  parseLinkedInPrompt,
  interviewPrepPrompt,
} from '../prompts/index.js';

// Primary → fallback model order
const MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];

function getInstance(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY is not set in backend/.env');
  }
  return new GoogleGenerativeAI(apiKey);
}

function isModelUnavailable(error: unknown): boolean {
  const msg = String((error as any)?.message || '');
  return (
    msg.includes('NOT_FOUND') ||
    msg.includes('is not supported for generateContent') ||
    msg.includes('does not support') ||
    msg.includes('INVALID_ARGUMENT')
  );
}

function mapError(error: unknown): Error {
  const msg = String((error as any)?.message || '');
  console.error('[Gemini error]', msg); // always log the real error server-side

  if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid'))
    return new Error('Invalid Gemini API key. Check GEMINI_API_KEY in backend/.env.');
  if (msg.includes('QUOTA_EXCEEDED') || msg.includes('quota'))
    return new Error('Gemini API quota exceeded. Try again later.');
  if (msg.includes('PERMISSION_DENIED'))
    return new Error('Gemini API access denied. Check your API key permissions.');
  if (msg.includes('GEMINI_API_KEY is not set'))
    return new Error(msg);

  // In development pass the raw message through so the UI shows what actually went wrong
  if (process.env.NODE_ENV !== 'production' && msg) {
    return new Error(`Gemini error: ${msg}`);
  }
  return new Error('Gemini request failed. Please try again.');
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async function generateJSON<T>(prompt: string): Promise<T> {
  const client = getInstance();
  for (const modelName of MODELS) {
    try {
      const model = client.getGenerativeModel({
        model: modelName,
        generationConfig: { responseMimeType: 'application/json' },
      });
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      return JSON.parse(text) as T;
    } catch (error: unknown) {
      if (isModelUnavailable(error)) {
        console.warn(`[Gemini] model "${modelName}" unavailable, trying next...`);
        continue;
      }
      throw mapError(error);
    }
  }
  throw new Error('All Gemini model candidates are unavailable. Check your API key and quota.');
}

export async function* generateTextStream(prompt: string): AsyncGenerator<string> {
  const client = getInstance();
  for (const modelName of MODELS) {
    try {
      const model = client.getGenerativeModel({ model: modelName });
      const result = await model.generateContentStream(prompt);
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) yield text;
      }
      return;
    } catch (error: unknown) {
      if (isModelUnavailable(error)) {
        console.warn(`[Gemini] model "${modelName}" unavailable, trying next...`);
        continue;
      }
      throw mapError(error);
    }
  }
  throw new Error('All Gemini model candidates are unavailable. Check your API key and quota.');
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function analyzeResume(resume: string, jobDescription: string) {
  return generateJSON(analyzeResumePrompt(resume, jobDescription));
}

export interface JobAnalysis {
  matchScore: number;
  missingKeywords: string[];
  strengths: string[];
  topSuggestion: string;
}

export async function analyzeResumeForJob(
  resume: string,
  jobDescription: string,
  jobTitle: string
): Promise<JobAnalysis> {
  return generateJSON<JobAnalysis>(compareJobsPrompt(resume, jobDescription, jobTitle));
}

export function generateImprovedResumeStream(
  resume: string,
  jobDescription: string,
  suggestions: string[]
): AsyncGenerator<string> {
  return generateTextStream(generateImprovedResumePrompt(resume, jobDescription, suggestions));
}

export function generateCoverLetterStream(
  resume: string,
  jobDescription: string,
  applicantName: string
): AsyncGenerator<string> {
  return generateTextStream(generateCoverLetterPrompt(resume, jobDescription, applicantName));
}

export async function parseLinkedInResume(rawText: string): Promise<string> {
  const client = getInstance();
  for (const modelName of MODELS) {
    try {
      const model = client.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(parseLinkedInPrompt(rawText));
      return result.response.text().trim();
    } catch (error: unknown) {
      if (isModelUnavailable(error)) {
        console.warn(`[Gemini] model "${modelName}" unavailable, trying next...`);
        continue;
      }
      throw mapError(error);
    }
  }
  throw new Error('All Gemini model candidates are unavailable.');
}

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

export async function generateInterviewPrep(
  resume: string,
  jobDescription: string
): Promise<InterviewPrepResult> {
  return generateJSON<InterviewPrepResult>(interviewPrepPrompt(resume, jobDescription));
}
