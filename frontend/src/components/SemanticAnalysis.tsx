import { useState } from 'react';
import { BrainCircuit, Check, Loader2, X } from 'lucide-react';
import { semanticAnalyze, SemanticAnalysisResult } from '../services/resumeApi';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { SEMANTIC_THRESHOLDS, scoreLabel, scoreTone, TONE_BG, TONE_TEXT } from '@/lib/score';
import { cn, getErrorMessage } from '@/lib/utils';

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

export default function SemanticAnalysis({ resume, jobDescription, onUpgradeClick }: Props) {
  const [result, setResult] = useState<SemanticAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!resume.trim() || !jobDescription.trim()) {
      setError('Paste your resume and job description first.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setResult(await semanticAnalyze(resume, jobDescription));
    } catch (e: unknown) {
      const msg = getErrorMessage(e, 'Analysis failed.');
      if (msg.includes('USAGE_LIMIT_REACHED') || msg.includes('Monthly limit reached')) {
        onUpgradeClick();
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
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
          <Button onClick={run} disabled={loading} className="shrink-0">
            {loading && <Loader2 className="animate-spin" />}
            {loading ? 'Analyzing…' : result ? 'Run again' : 'Run analysis'}
          </Button>
        </CardHeader>
      </Card>

      {error && (
        <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

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
    </div>
  );
}
