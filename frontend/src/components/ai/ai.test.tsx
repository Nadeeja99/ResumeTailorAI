import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MarkdownRenderer from './MarkdownRenderer';
import { StreamControls } from './StreamControls';
import { TelemetryDrawer } from './telemetry/TelemetryDrawer';
import type { AITelemetry } from '@/types/ai';

const TELEMETRY: AITelemetry = {
  requestId: 'req-123',
  operation: 'generate-improved',
  promptVersion: 'v2',
  model: 'gemini-3.6-flash',
  modelVersion: 'gemini-3.6-flash',
  attempts: [
    { model: 'gemini-3.8-flash', ok: false, status: 503, error: 'high demand' },
    { model: 'gemini-3.6-flash', ok: true },
  ],
  calls: 1,
  ttftMs: 820,
  totalMs: 4200,
  usage: { promptTokens: 400, outputTokens: 600, thoughtsTokens: 0, totalTokens: 1000 },
  finishReason: 'STOP',
  schema: null,
  context: [{ name: 'resume', chars: 2000 }],
  embeddings: null,
  thinkingLevel: 'LOW',
  prompts: [{ system: 'You are an expert resume writer.', user: '<resume>…</resume>' }],
};

describe('MarkdownRenderer', () => {
  it('renders GFM, highlights fenced code with a copy button, and never renders raw HTML', () => {
    const md = [
      '## Experience',
      '**Senior Engineer** at Acme',
      '<img src=x onerror="alert(1)"><script>alert(1)</script>',
      '[bad](javascript:alert(1)) [good](https://example.com)',
      '```ts',
      'const x: number = 1;',
      '```',
    ].join('\n');
    const { container } = render(<MarkdownRenderer content={md} />);

    expect(screen.getByRole('heading', { level: 2, name: 'Experience' })).toBeInTheDocument();
    expect(screen.getByText('Senior Engineer').tagName).toBe('STRONG');
    expect(container.querySelector('script, img')).toBeNull();
    expect(screen.getByText('bad').getAttribute('href') ?? '').not.toMatch(/javascript:/i);
    expect(screen.getByText('good')).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByText('ts')).toBeInTheDocument(); // language label
    expect(screen.getByRole('button', { name: /copy code/i })).toBeInTheDocument();
    expect(container.querySelector('pre')?.textContent).toContain('const x: number = 1;');
  });
});

describe('TelemetryDrawer', () => {
  it('summarises the call and expands into latency, tokens, provenance and prompts', async () => {
    const user = userEvent.setup();
    render(<TelemetryDrawer telemetry={TELEMETRY} timing={{ ttfbMs: 120, ttftMs: 950, totalMs: 4400 }} />);

    const trigger = screen.getByRole('button', { name: /system telemetry/i });
    expect(trigger).toHaveTextContent('gemini-3.6-flash');
    expect(trigger).toHaveTextContent('TTFT 820 ms');
    expect(trigger).toHaveTextContent('1,000 tok');
    expect(trigger).toHaveTextContent('fallback');

    await user.click(trigger);
    expect(screen.getByText('Network + proxy').nextSibling).toHaveTextContent('200 ms');
    expect(screen.getByText('Output speed').nextSibling).toHaveTextContent('178 tok/s'); // 600 tok / 3.38 s
    expect(screen.getByText('Thinking level').nextSibling).toHaveTextContent('LOW');
    expect(screen.getByText(/503 high demand/)).toBeInTheDocument();
    expect(screen.getByText('Call 1')).toBeInTheDocument();
  });

  it('labels heuristic results instead of showing model telemetry', () => {
    render(<TelemetryDrawer telemetry={null} timing={null} source="heuristic" />);
    expect(screen.getByText('source: local heuristic')).toBeInTheDocument();
  });

  it('explains when the server hides prompts', async () => {
    const user = userEvent.setup();
    render(<TelemetryDrawer telemetry={{ ...TELEMETRY, prompts: undefined }} timing={null} />);
    await user.click(screen.getByRole('button', { name: /system telemetry/i }));
    expect(screen.getByText(/EXPOSE_PROMPTS=false/)).toBeInTheDocument();
  });
});

describe('StreamControls', () => {
  it('shows live progress and stops on Esc while streaming', async () => {
    const user = userEvent.setup();
    const onStop = vi.fn();
    const now = performance.now();
    render(
      <StreamControls status="streaming" startedAt={now - 2000} firstChunkAt={now - 1000} chars={800} timing={null} onStop={onStop} />
    );

    expect(screen.getByText('Writing')).toBeInTheDocument();
    expect(screen.getByText(/tok\/s/)).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('reports the final duration and ignores Esc once done', async () => {
    const user = userEvent.setup();
    const onStop = vi.fn();
    render(<StreamControls status="success" startedAt={0} firstChunkAt={0} chars={10} timing={{ ttfbMs: 1, ttftMs: 2, totalMs: 4200 }} onStop={onStop} />);

    expect(screen.getByText('Done in 4.2 s')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(onStop).not.toHaveBeenCalled();
  });
});
