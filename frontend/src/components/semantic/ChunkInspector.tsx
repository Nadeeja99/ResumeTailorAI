import { useState } from 'react';
import { ChevronDown, ScanSearch } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { estimateTokens } from '@/components/ai/telemetry/metrics';
import { cn } from '@/lib/utils';
import type { SemanticAnalysisResult, SemanticCalibration } from '@/services/resumeApi';

const TH = 'px-3 py-2 text-left text-xs font-medium text-muted-foreground';
const TD = 'px-3 py-2 align-top';

/** Position of a raw cosine on the calibrated scale, with the coverage threshold marked. */
function CosineMeter({ value, covered, calibration }: { value: number; covered: boolean; calibration: SemanticCalibration }) {
  const { floor, range, coveredThreshold } = calibration;
  const min = floor - range * 0.25;
  const max = floor + range * 1.25;
  const pct = (v: number) => `${Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100))}%`;
  const threshold = floor + (coveredThreshold / 100) * range;
  return (
    <div className="relative h-1.5 w-24 rounded-full bg-muted" aria-hidden>
      <div className="absolute inset-y-[-3px] w-px bg-foreground/40" style={{ left: pct(threshold) }} />
      <div
        className={cn('absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card', covered ? 'bg-success' : 'bg-destructive')}
        style={{ left: pct(value) }}
      />
    </div>
  );
}

/** Shows how the semantic score was computed: chunks, raw cosine similarity, calibration and evidence. */
export function ChunkInspector({ result }: { result: SemanticAnalysisResult }) {
  const [open, setOpen] = useState(false);
  const { calibration } = result;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border bg-card">
      <CollapsibleTrigger className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <ScanSearch className="h-4 w-4 text-muted-foreground" aria-hidden />
        <span className="font-medium">Chunk inspector</span>
        <span className="hidden font-mono text-xs text-muted-foreground sm:inline">
          {result.sections.length} sections · {result.evidenceChunks} evidence chunks · {calibration.model}
        </span>
        <ChevronDown className={cn('ml-auto h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} aria-hidden />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-6 border-t px-4 py-5">
        <p className="text-xs text-muted-foreground">
          Score = (cosine − <span className="font-mono">{calibration.floor}</span>) ÷{' '}
          <span className="font-mono">{calibration.range}</span> × 100, clamped to 0–100. Requirements are matched against
          individual resume lines (hybrid): covered when the score is ≥{' '}
          <span className="font-mono">{calibration.coveredThreshold}</span> <em>and</em> a distinctive requirement keyword
          appears in the resume — or when cosine alone is ≥ <span className="font-mono">{calibration.strongSimilarity}</span>.
          This stops dense skill lists from matching every technology.
        </p>

        <div>
          <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Sections vs. job description</h4>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className={TH}>Section</th>
                  <th className={TH}>Size</th>
                  <th className={TH}>Cosine</th>
                  <th className={TH}>Score</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {result.sections.map(s => (
                  <tr key={s.name}>
                    <td className={TD}>
                      <details>
                        <summary className="cursor-pointer font-medium">{s.name}</summary>
                        <p className="mt-2 max-w-prose whitespace-pre-wrap text-xs text-muted-foreground">{s.text}</p>
                      </details>
                    </td>
                    <td className={cn(TD, 'whitespace-nowrap font-mono text-xs')}>
                      {s.chars.toLocaleString()} ch · ~{estimateTokens(s.chars)} tok
                    </td>
                    <td className={cn(TD, 'font-mono text-xs')}>{s.rawSimilarity.toFixed(3)}</td>
                    <td className={cn(TD, 'font-mono text-xs')}>{s.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Requirement evidence</h4>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className={TH}>Requirement</th>
                  <th className={TH}>Best-matching resume line</th>
                  <th className={TH}>Cosine</th>
                  <th className={TH}>Score</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {result.requirementCoverage.map(r => (
                  <tr key={r.requirement}>
                    <td className={cn(TD, 'font-medium')}>
                      <span className="flex flex-col gap-1">
                        {r.requirement}
                        <Badge variant={r.covered ? 'success' : 'danger'} className="w-fit font-normal">
                          {r.covered ? 'covered' : 'gap'}
                        </Badge>
                      </span>
                    </td>
                    <td className={cn(TD, 'min-w-[16rem] text-xs text-muted-foreground')}>
                      “{r.evidence}” <span className="whitespace-nowrap">— {r.bestSection}</span>
                      <span className="mt-1 block font-mono text-[11px]">
                        {r.matchedTerms.length > 0 ? `keywords: ${r.matchedTerms.join(', ')}` : 'no keyword match'}
                      </span>
                    </td>
                    <td className={TD}>
                      <span className="flex items-center gap-2 font-mono text-xs">
                        {r.rawSimilarity.toFixed(3)}
                        <CosineMeter value={r.rawSimilarity} covered={r.covered} calibration={calibration} />
                      </span>
                    </td>
                    <td className={cn(TD, 'font-mono text-xs')}>{r.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
