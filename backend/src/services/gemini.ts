import {
  analyzeResumePrompt,
  compareJobsPrompt,
  generateCoverLetterPrompt,
  generateImprovedResumePrompt,
  parseLinkedInPrompt,
  interviewPrepPrompt,
} from '../prompts/index.js';
import {
  analysisOutputSchema,
  interviewPrepOutputSchema,
  jobMatchOutputSchema,
  type InterviewPrepResult,
  type JobAnalysis,
  type ResumeAnalysis,
} from '../schemas/ai.js';
import type { CallContext } from './llm/client.js';
import { generateStructured } from './llm/structured.js';
import { generateText, streamText } from './llm/text.js';

export type { CallContext } from './llm/client.js';
export type { InterviewPrepResult, InterviewQuestion, JobAnalysis, ResumeAnalysis } from '../schemas/ai.js';

export function analyzeResume(resume: string, jobDescription: string, ctx: CallContext): Promise<ResumeAnalysis> {
  return generateStructured(analyzeResumePrompt(resume, jobDescription), analysisOutputSchema, ctx);
}

export function analyzeResumeForJob(
  resume: string,
  jobDescription: string,
  jobTitle: string,
  ctx: CallContext
): Promise<JobAnalysis> {
  return generateStructured(compareJobsPrompt(resume, jobDescription, jobTitle), jobMatchOutputSchema, ctx);
}

export function generateImprovedResumeStream(
  resume: string,
  jobDescription: string,
  suggestions: string[],
  ctx: CallContext
): AsyncGenerator<string> {
  return streamText(generateImprovedResumePrompt(resume, jobDescription, suggestions), ctx);
}

export function generateCoverLetterStream(
  resume: string,
  jobDescription: string,
  applicantName: string,
  ctx: CallContext
): AsyncGenerator<string> {
  return streamText(generateCoverLetterPrompt(resume, jobDescription, applicantName), ctx);
}

export function parseLinkedInResume(rawText: string, ctx: CallContext): Promise<string> {
  return generateText(parseLinkedInPrompt(rawText), ctx);
}

export function generateInterviewPrep(
  resume: string,
  jobDescription: string,
  ctx: CallContext
): Promise<InterviewPrepResult> {
  return generateStructured(interviewPrepPrompt(resume, jobDescription), interviewPrepOutputSchema, ctx);
}
