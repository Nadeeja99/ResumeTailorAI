import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { JD, RESUME, parseSSE } from './helpers.js';

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

describe('POST /api/analyze', () => {
  it('returns analysis wrapped with telemetry for valid input', async () => {
    const res = await request(app)
      .post('/api/analyze')
      .send({ resume: RESUME, jobDescription: JD });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('matchScore');
    expect(res.body.data).toHaveProperty('missingKeywords');
    expect(res.body.data).toHaveProperty('strengths');
    expect(res.body.data).toHaveProperty('toneAnalysis');
    expect(res.body.data).toHaveProperty('atsOptimization');
    expect(res.body.telemetry).toMatchObject({
      operation: 'analyze',
      requestId: res.headers['x-request-id'],
      context: [
        { name: 'resume', chars: RESUME.length },
        { name: 'jobDescription', chars: JD.length },
      ],
    });
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
  it('streams meta, chunks, then done with telemetry', async () => {
    const res = await request(app)
      .post('/api/generate-improved')
      .send({ resume: RESUME, jobDescription: JD, suggestions: ['Add Docker'] });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/event-stream');

    const events = parseSSE(res.text);
    expect(events.map(e => e.type)).toEqual(['meta', 'chunk', 'chunk', 'chunk', 'done']);
    expect(events.filter(e => e.type === 'chunk').map(e => e.text).join('')).toBe('Improved resume text');
    expect(events[0]).toMatchObject({ operation: 'generate-improved', requestId: res.headers['x-request-id'] });
    expect(events.at(-1)).toHaveProperty('telemetry.operation', 'generate-improved');
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
    expect(parseSSE(res.text).at(-1)?.type).toBe('done');
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
    expect(Array.isArray(res.body.data.results)).toBe(true);
    expect(res.body.data.results.length).toBe(2);
    expect(res.body.data.results[0]).toMatchObject({ id: '1', title: 'Frontend Engineer', matchScore: 72 });
    expect(res.body.telemetry.context.map((c: { name: string }) => c.name)).toEqual([
      'resume',
      'job: Frontend Engineer',
      'job: Backend Engineer',
    ]);
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
