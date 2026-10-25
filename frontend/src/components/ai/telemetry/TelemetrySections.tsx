import type { ReactNode } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CopyButton } from '@/components/common/CopyButton';
import { formatDuration } from '@/hooks/useElapsed';
import type { AITelemetry, ClientTiming } from '@/types/ai';
import { deriveMetrics, estimateTokens } from './metrics';

const dash = '—';
const ms = (value: number | null | undefined) => (value === null || value === undefined ? dash : formatDuration(value));

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</h4>
      <dl className="space-y-1.5">{children}</dl>
    </section>
  );
}

function Metric({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <dt className="text-muted-foreground" title={hint}>{label}</dt>
      <dd className="text-right font-mono text-xs tabular-nums">{value}</dd>
    </div>
  );
}

export function LatencySection({ telemetry: t, timing }: { telemetry: AITelemetry; timing: ClientTiming | null }) {
  const { generationMs, outputTokensPerSec, overheadMs } = deriveMetrics(t, timing);
  return (
    <Section title="Latency">
      <Metric label="TTFT (server)" value={ms(t.ttftMs)} hint="Model request start → first token" />
      <Metric label="TTFT (browser)" value={ms(timing?.ttftMs)} hint="Click → first token rendered, incl. network" />
      <Metric label="TTFB (browser)" value={ms(timing?.ttfbMs)} hint="Response headers received" />
      <Metric label="Generation" value={ms(generationMs)} />
      <Metric label="Total (server)" value={ms(t.totalMs)} />
      <Metric label="Total (browser)" value={ms(timing?.totalMs)} />
      <Metric label="Network + proxy" value={ms(overheadMs)} hint="Browser total − server total" />
      <Metric label="Output speed" value={outputTokensPerSec === null ? dash : `${outputTokensPerSec} tok/s`} />
    </Section>
  );
}

export function TokenSection({ telemetry: t }: { telemetry: AITelemetry }) {
  if (!t.usage) {
    return (
      <Section title="Tokens">
        <p className="text-sm text-muted-foreground">No usage reported{t.embeddings ? ' (embedding-only call)' : ''}.</p>
      </Section>
    );
  }
  const { promptTokens, thoughtsTokens, outputTokens, totalTokens } = t.usage;
  const parts = [
    { label: 'Prompt', value: promptTokens, className: 'bg-muted-foreground/40' },
    { label: 'Thinking', value: thoughtsTokens, className: 'bg-warning' },
    { label: 'Output', value: outputTokens, className: 'bg-primary' },
  ];
  return (
    <Section title="Tokens">
      <div className="mb-3 flex h-2 overflow-hidden rounded-full bg-muted" role="img" aria-label="Token usage breakdown">
        {parts.map(p => (
          <div key={p.label} className={p.className} style={{ width: `${(p.value / Math.max(totalTokens, 1)) * 100}%` }} />
        ))}
      </div>
      {parts.map(p => (
        <Metric
          key={p.label}
          label={p.label}
          value={
            <span className="inline-flex items-center gap-1.5">
              <span className={`inline-block h-2 w-2 rounded-full ${p.className}`} aria-hidden />
              {p.value.toLocaleString()}
            </span>
          }
        />
      ))}
      <Metric label="Total" value={totalTokens.toLocaleString()} />
      <Metric label="Model calls" value={t.calls} hint="Includes schema-repair retries and parallel calls" />
    </Section>
  );
}

export function ProvenanceSection({ telemetry: t }: { telemetry: AITelemetry }) {
  return (
    <Section title="Model & provenance">
      <Metric label="Model" value={t.model ?? dash} />
      {t.modelVersion && t.modelVersion !== t.model && <Metric label="Model version" value={t.modelVersion} />}
      <Metric label="Prompt version" value={t.promptVersion} />
      <Metric label="Thinking level" value={t.thinkingLevel ?? 'model default'} />
      <Metric label="Finish reason" value={t.finishReason ?? dash} />
      {t.schema && (
        <Metric
          label="Output schema"
          value={<Badge variant={t.schema === 'valid' ? 'success' : t.schema === 'repaired' ? 'warning' : 'danger'}>{t.schema}</Badge>}
        />
      )}
      <Metric
        label="Request ID"
        value={
          <span className="inline-flex items-center gap-1">
            <span className="max-w-[9rem] truncate">{t.requestId}</span>
            <CopyButton value={t.requestId} label="Copy" className="h-6 px-1" />
          </span>
        }
      />
      <div className="pt-1">
        <p className="mb-1 text-xs text-muted-foreground">Fallback chain</p>
        <ol className="space-y-1">
          {t.attempts.map((a, i) => (
            <li key={i} className="flex items-start gap-2 font-mono text-xs">
              {a.ok ? (
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-label="succeeded" />
              ) : (
                <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" aria-label="failed" />
              )}
              <span>
                {a.model}
                {!a.ok && <span className="text-muted-foreground"> — {a.status ?? 'error'} {a.error}</span>}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
}

export function ContextSection({ telemetry: t }: { telemetry: AITelemetry }) {
  return (
    <Section title="Context sources">
      {t.context.map(c => (
        <Metric key={c.name} label={c.name} value={`${c.chars.toLocaleString()} ch · ~${estimateTokens(c.chars).toLocaleString()} tok`} />
      ))}
      {t.embeddings && (
        <>
          <Metric label="Embedding model" value={t.embeddings.model} />
          <Metric label="Embedding calls" value={`${t.embeddings.calls} (${t.embeddings.inputs} inputs)`} />
        </>
      )}
    </Section>
  );
}
