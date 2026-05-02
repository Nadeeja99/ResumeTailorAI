import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../app.js';

// Mock Gemini service so tests don't make real API calls
vi.mock('../services/gemini.js', () => ({
  analyzeResume: vi.fn().mockResolvedValue({
    matchScore: 78,
    missingKeywords: ['docker', 'kubernetes'],
    suggestedImprovements: ['Add Docker experience'],
    strengths: ['Strong TypeScript background'],
    toneAnalysis: { score: 85, feedback: 'Professional tone.' },
    atsOptimization: { score: 80, suggestions: ['Use standard headings'] },
  }),
  analyzeResumeForJob: vi.fn().mockResolvedValue({
    matchScore: 72,
    missingKeywords: ['aws'],
    strengths: ['React expertise'],
    topSuggestion: 'Add cloud experience',
  }),
  generateImprovedResumeStream: vi.fn().mockImplementation(async function* () {
    yield 'Improved ';
    yield 'resume ';
    yield 'text';
  }),
  generateCoverLetterStream: vi.fn().mockImplementation(async function* () {
    yield 'Dear Hiring Manager, ';
    yield 'I am excited to apply.';
  }),
}));

const RESUME = 'John Doe\nSoftware Engineer with 5 years of experience in TypeScript and React. Built scalable web applications. Led team of 4 engineers.';
const JD = 'We are looking for a Senior Frontend Engineer with experience in React, TypeScript, Docker, and Kubernetes. Must have strong communication skills.';

describe('POST /api/analyze', () => {
  it('returns analysis for valid input', async () => {
    const res = await request(app)
      .post('/api/analyze')
      .send({ resume: RESUME, jobDescription: JD });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('matchScore');
    expect(res.body).toHaveProperty('missingKeywords');
    expect(res.body).toHaveProperty('strengths');
    expect(res.body).toHaveProperty('toneAnalysis');
    expect(res.body).toHaveProperty('atsOptimization');
  });

  it('returns 400 when resume is missing', async () => {
    const res = await request(app)
      .post('/api/analyze')
      .send({ jobDescription: JD });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when jobDescription is missing', async () => {
    const res = await request(app)
      .post('/api/analyze')
      .send({ resume: RESUME });
    expect(res.status).toBe(400);
  });

  it('returns 400 when resume is too short', async () => {
    const res = await request(app)
      .post('/api/analyze')
      .send({ resume: 'short', jobDescription: JD });
    expect(res.status).toBe(400);
  });

  it('returns 400 when resume exceeds max length', async () => {
    const res = await request(app)
      .post('/api/analyze')
      .send({ resume: 'a'.repeat(16000), jobDescription: JD });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/generate-improved (streaming SSE)', () => {
  it('streams SSE events for valid input', async () => {
    const res = await request(app)
      .post('/api/generate-improved')
      .send({ resume: RESUME, jobDescription: JD, suggestions: ['Add Docker'] });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/event-stream');
    expect(res.text).toContain('data:');
    expect(res.text).toContain('[DONE]');
  });

  it('returns 400 for missing fields', async () => {
    const res = await request(app)
      .post('/api/generate-improved')
      .send({ resume: RESUME });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/generate-cover-letter (streaming SSE)', () => {
  it('streams a cover letter for valid input', async () => {
    const res = await request(app)
      .post('/api/generate-cover-letter')
      .send({ resume: RESUME, jobDescription: JD, applicantName: 'Jane Smith' });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/event-stream');
    expect(res.text).toContain('[DONE]');
  });
});

describe('POST /api/compare-jobs', () => {
  it('returns comparison results for valid input', async () => {
    const res = await request(app)
      .post('/api/compare-jobs')
      .send({
        resume: RESUME,
        jobDescriptions: [
          { id: '1', title: 'Frontend Engineer', description: JD },
          { id: '2', title: 'Backend Engineer', description: JD + ' Node.js Express PostgreSQL' },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('results');
    expect(Array.isArray(res.body.results)).toBe(true);
    expect(res.body.results.length).toBe(2);
  });

  it('returns 400 when jobDescriptions is empty', async () => {
    const res = await request(app)
      .post('/api/compare-jobs')
      .send({ resume: RESUME, jobDescriptions: [] });
    expect(res.status).toBe(400);
  });

  it('returns 400 when more than 5 jobs are provided', async () => {
    const jobs = Array.from({ length: 6 }, (_, i) => ({
      id: String(i),
      title: `Job ${i}`,
      description: JD,
    }));
    const res = await request(app)
      .post('/api/compare-jobs')
      .send({ resume: RESUME, jobDescriptions: jobs });
    expect(res.status).toBe(400);
  });
});
