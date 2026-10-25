import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OptimizerTab } from './OptimizerTab';

const RESUME = 'Jane Doe — Senior Frontend Engineer with 6 years of React and TypeScript experience at fintech companies.';
const JD = 'We need a Senior Frontend Engineer skilled in React, TypeScript, Docker and Kubernetes.';

const ANALYSIS = {
  matchScore: 72,
  missingKeywords: ['docker'],
  suggestedImprovements: ['Mention Docker'],
  strengths: ['React expertise'],
  toneAnalysis: { score: 80, feedback: 'Clear.' },
  atsOptimization: { score: 75, suggestions: ['Use standard headings'] },
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

function sse(events: object[]) {
  return new Response(events.map(e => `data: ${JSON.stringify(e)}\n\n`).join(''), {
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

function mockApi(routes: Record<string, () => Response>) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
    const path = String(input).replace(/^\/api/, '');
    const route = routes[path];
    if (!route) throw new TypeError(`Unmocked request: ${path}`);
    return route();
  });
}

function Harness() {
  const [resume, setResume] = useState('');
  const [jd, setJd] = useState('');
  return (
    <OptimizerTab
      resume={resume}
      jobDescription={jd}
      onResumeChange={setResume}
      onJobDescriptionChange={setJd}
      onAnalyzed={() => {}}
      onUsageLimit={() => {}}
    />
  );
}

async function fillInputs(resume = RESUME, jd = JD) {
  const user = userEvent.setup();
  render(<Harness />);
  await user.click(screen.getByLabelText('Resume'));
  await user.paste(resume);
  await user.click(screen.getByLabelText('Job description'));
  await user.paste(jd);
  return user;
}

describe('OptimizerTab', () => {
  it('autofocuses the resume and validates inputs inline before enabling Analyze', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.getByLabelText('Resume')).toHaveFocus();

    await user.paste('Too short');
    expect(screen.getByText(/needs at least 50 characters \(9 so far\)/)).toBeInTheDocument();
    expect(screen.getByLabelText('Resume')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('button', { name: /analyze resume/i })).toBeDisabled();
  });

  it('submits with Ctrl+Enter and renders the analysis', async () => {
    const fetchSpy = mockApi({ '/analyze': () => json({ data: ANALYSIS, telemetry: { requestId: 'r1' } }) });
    const user = await fillInputs();

    await user.keyboard('{Control>}{Enter}{/Control}');

    expect(await screen.findByText('72%')).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Mention Docker')).toBeInTheDocument();
  });

  it('falls back to the local heuristic when the AI service is down', async () => {
    mockApi({ '/analyze': () => json({ error: 'Gemini is temporarily unavailable.', code: 'UNAVAILABLE' }, 503) });
    const user = await fillInputs();

    await user.click(screen.getByRole('button', { name: /analyze resume/i }));

    expect(await screen.findByText(/AI unavailable — showing a local keyword analysis/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry with ai/i })).toBeInTheDocument();
  });

  it('shows an inline error (no heuristic) for client errors like rate limits', async () => {
    mockApi({ '/analyze': () => json({ error: 'Too many AI requests.', code: 'RATE_LIMITED' }, 429) });
    const user = await fillInputs();

    await user.click(screen.getByRole('button', { name: /analyze resume/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Too many AI requests.');
    expect(screen.queryByText(/local keyword analysis/)).not.toBeInTheDocument();
  });

  it('streams the tailored resume into the preview', async () => {
    mockApi({
      '/analyze': () => json({ data: ANALYSIS, telemetry: { requestId: 'r1' } }),
      '/generate-improved': () =>
        sse([
          { type: 'meta', requestId: 'r2', operation: 'generate-improved', promptVersion: 'v1.1' },
          { type: 'chunk', text: '# Jane Doe\n\n## Summary\n' },
          { type: 'chunk', text: 'Tailored summary line' },
          { type: 'done', telemetry: { requestId: 'r2' } },
        ]),
    });
    const user = await fillInputs();
    await user.click(screen.getByRole('button', { name: /analyze resume/i }));
    await user.click(await screen.findByRole('button', { name: /generate tailored resume/i }));

    expect(await screen.findByRole('heading', { name: 'Summary' })).toBeInTheDocument();
    expect(screen.getByText('Tailored summary line')).toBeInTheDocument();
    expect(await screen.findByRole('tab', { name: /changes/i })).toBeInTheDocument();
  });
});
