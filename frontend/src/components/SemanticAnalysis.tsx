import { BrainCircuit, Check, X } from 'lucide-react';
import { isUsageLimitError, semanticAnalyze, type SemanticAnalysisResult } from '@/services/resumeApi';
import { RequestError } from '@/components/common/RequestError';
import { CancelButton } from '@/components/ai/CancelButton';
import { TelemetryDrawer } from '@/components/ai/telemetry/TelemetryDrawer';
import { ChunkInspector } from '@/components/semantic/ChunkInspector';
import { Skeleton } from '@/components/ui/skeleton';
import { useAITask } from '@/hooks/useAI';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { SEMANTIC_THRESHOLDS, scoreLabel, scoreTone, TONE_BG, TONE_TEXT } from '@/lib/score';
import { cn } from '@/lib/utils';

interface Props {
  resume: string;
  jobDescription: string;
  onUpgradeClick: () => void;
}

function ScoreRing({ score, size = 112 }: { score: number; size?: number }) {
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const tone = scoreTone(score, SEMANTIC_THRESHOLDS);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn('stroke-current transition-[stroke-dashoffset] duration-700', TONE_TEXT[tone])}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-2xl font-semibold tabular-nums">
        {score}
      </span>
    </div>
  );
}

function SectionScores({ sections }: { sections: SemanticAnalysisResult['sections'] }) {
  return (
    <div className="space-y-4">
      {sections.map(s => {
        const tone = scoreTone(s.score, SEMANTIC_THRESHOLDS);
        return (
          <div key={s.name}>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="font-medium">{s.name}</span>
              <span className={cn('font-medium tabular-nums', TONE_TEXT[tone])}>{s.score}%</span>
            </div>
            <Progress value={s.score} indicatorClassName={TONE_BG[tone]} />
            <p className="mt-1.5 truncate text-xs text-muted-foreground">{s.excerpt}</p>
          </div>
        );
      })}
    </div>
  );
}

function SemanticSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3" aria-busy="true" aria-label="Running semantic analysis">
      <Card className="flex flex-col items-center justify-center gap-4 p-6">
        <Skeleton className="h-28 w-28 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </Card>
      <Card className="space-y-5 p-6 lg:col-span-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-2 w-full" />
          </div>
        ))}
      </Card>
    </div>
  );
}

export default function SemanticAnalysis({ resume, jobDescription, onUpgradeClick }: Props) {
  const task = useAITask<SemanticAnalysisResult>();
  const result = task.data;

  async function run() {
    const outcome = await task.run(signal => semanticAnalyze(resume, jobDescription, { signal }));
    if (outcome.status === 'error' && isUsageLimitError(outcome.error)) onUpgradeClick();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="gap-4 space-y-0 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2">
              <BrainCircuit className="h-4 w-4 text-muted-foreground" aria-hidden />
              Semantic match
            </CardTitle>
            <CardDescription>
              Scores how closely each resume section matches the job description’s meaning using embeddings — beyond
              keyword overlap.
            </CardDescription>
          </div>
          {task.isPending ? (
            <CancelButton startedAt={task.startedAt} onCancel={task.abort} />
          ) : (
            <Button onClick={run} className="shrink-0">
              {result ? 'Run again' : 'Run analysis'}
            </Button>
          )}
        </CardHeader>
      </Card>

      {task.status === 'error' && task.error && <RequestError error={task.error} onRetry={run} telemetry={task.telemetry} />}
      {task.isPending && <SemanticSkeleton />}

      {result && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="flex flex-col items-center justify-center p-6 text-center">
            <ScoreRing score={result.overallScore} />
            <p className="mt-4 text-sm font-medium">Overall semantic score</p>
            <p className="mt-1 text-xs text-muted-foreground">{scoreLabel(result.overallScore, SEMANTIC_THRESHOLDS)}</p>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm">Section scores</CardTitle>
            </CardHeader>
            <CardContent>
              <SectionScores sections={result.sections} />
            </CardContent>
          </Card>

          <Card className={result.topGaps.length > 0 ? 'lg:col-span-2' : 'lg:col-span-3'}>
            <CardHeader className="pb-4">
              <CardTitle className="text-sm">Requirement coverage</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {result.requirementCoverage.map(r => (
                <Badge key={r.requirement} variant={r.covered ? 'success' : 'danger'} className="font-normal">
                  {r.covered ? <Check className="h-3 w-3" aria-hidden /> : <X className="h-3 w-3" aria-hidden />}
                  {r.requirement}
                </Badge>
              ))}
            </CardContent>
          </Card>

          {result.topGaps.length > 0 && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-sm">Top gaps to address</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {result.topGaps.map(gap => (
                    <li key={gap} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" aria-hidden />
                      {gap}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {result && (
        <>
          <ChunkInspector result={result} />
          <TelemetryDrawer telemetry={task.telemetry} timing={task.timing} />
        </>
      )}
    </div>
  );
}
