import { useState } from 'react';
import { Activity, ChevronDown, Cpu } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { formatDuration } from '@/hooks/useElapsed';
import { cn } from '@/lib/utils';
import type { AITelemetry, ClientTiming } from '@/types/ai';
import { PromptInspector } from './PromptInspector';
import { ContextSection, LatencySection, ProvenanceSection, TokenSection } from './TelemetrySections';

interface TelemetryDrawerProps {
  telemetry: AITelemetry | null;
  timing: ClientTiming | null;
  /** `heuristic` = the result was computed locally because the AI was unreachable. */
  source?: 'model' | 'heuristic';
  className?: string;
}

/** Collapsible "System telemetry" inspector attached to an AI output. */
export function TelemetryDrawer({ telemetry, timing, source = 'model', className }: TelemetryDrawerProps) {
  const [open, setOpen] = useState(false);

  if (source === 'heuristic') {
    return (
      <div className={cn('flex flex-wrap items-center gap-2 rounded-lg border bg-card px-4 py-2.5 text-sm', className)}>
        <Cpu className="h-4 w-4 text-muted-foreground" aria-hidden />
        <span className="font-medium">System telemetry</span>
        <Badge variant="warning">source: local heuristic</Badge>
        <span className="text-xs text-muted-foreground">No model call — computed offline from keyword overlap.</span>
      </div>
    );
  }
  if (!telemetry) return null;

  const latency = telemetry.ttftMs ?? telemetry.totalMs;
  const fellBack = telemetry.attempts.some(a => !a.ok);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className={cn('rounded-lg border bg-card', className)}>
      <CollapsibleTrigger className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Activity className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="font-medium">System telemetry</span>
        <span className="hidden min-w-0 items-center gap-3 truncate font-mono text-xs text-muted-foreground md:flex">
          <span className="truncate">{telemetry.model ?? telemetry.embeddings?.model ?? 'n/a'}</span>
          <span>{telemetry.ttftMs !== null ? 'TTFT' : 'latency'} {formatDuration(latency)}</span>
          {telemetry.usage && <span>{telemetry.usage.totalTokens.toLocaleString()} tok</span>}
        </span>
        <span className="ml-auto flex items-center gap-2">
          {fellBack && <Badge variant="warning" className="hidden sm:inline-flex">fallback</Badge>}
          {telemetry.schema && telemetry.schema !== 'valid' && <Badge variant="warning">schema {telemetry.schema}</Badge>}
          <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} aria-hidden />
        </span>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-6 border-t px-4 py-5">
        <div className="grid grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-2">
          <LatencySection telemetry={telemetry} timing={timing} />
          <TokenSection telemetry={telemetry} />
          <ProvenanceSection telemetry={telemetry} />
          <ContextSection telemetry={telemetry} />
        </div>
        <PromptInspector prompts={telemetry.prompts} />
      </CollapsibleContent>
    </Collapsible>
  );
}
