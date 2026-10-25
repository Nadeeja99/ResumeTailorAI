import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { scoreLabel, scoreTone, TONE_BG, TONE_TEXT } from '@/lib/score';
import { cn } from '@/lib/utils';
import type { AnalysisResult } from '@/services/resumeApi';
import { AlertCircle, CheckCircle2, Lightbulb, Target } from 'lucide-react';

interface AnalysisResultsProps {
  analysis: AnalysisResult;
  isLoading: boolean;
}

function SectionCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function SubScore({ title, score, children }: { title: string; score: number; children: ReactNode }) {
  const tone = scoreTone(score);
  return (
    <SectionCard icon={null} title={title}>
      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">Score</span>
          <span className={cn('text-sm font-semibold tabular-nums', TONE_TEXT[tone])}>{score}%</span>
        </div>
        <Progress value={score} indicatorClassName={TONE_BG[tone]} />
        {children}
      </div>
    </SectionCard>
  );
}

export const AnalysisResults = ({ analysis, isLoading }: AnalysisResultsProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="h-4 w-40 animate-pulse rounded bg-muted" />
          <div className="h-8 w-24 animate-pulse rounded bg-muted" />
          <div className="h-2 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  const tone = scoreTone(analysis.matchScore);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Target className="h-4 w-4" aria-hidden /> Match score
              </p>
              <p className="mt-1 text-4xl font-semibold tabular-nums">{analysis.matchScore}%</p>
            </div>
            <Badge variant={tone}>{scoreLabel(analysis.matchScore)}</Badge>
          </div>
          <Progress value={analysis.matchScore} indicatorClassName={TONE_BG[tone]} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard icon={<AlertCircle className="h-4 w-4 text-warning" aria-hidden />} title="Missing keywords">
          {analysis.missingKeywords.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {analysis.missingKeywords.map((keyword, i) => (
                <Badge key={i} variant="outline">{keyword}</Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-success">All important keywords are present.</p>
          )}
        </SectionCard>

        <SectionCard icon={<CheckCircle2 className="h-4 w-4 text-success" aria-hidden />} title="Strengths">
          <ul className="space-y-2">
            {analysis.strengths.map((strength, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" aria-hidden />
                {strength}
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <SectionCard icon={<Lightbulb className="h-4 w-4 text-primary" aria-hidden />} title="Suggested improvements">
        <ol className="space-y-3">
          {analysis.suggestedImprovements.map((improvement, i) => (
            <li key={i} className="flex items-start gap-3 text-sm">
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium tabular-nums">
                {i + 1}
              </span>
              {improvement}
            </li>
          ))}
        </ol>
      </SectionCard>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <SubScore title="Tone" score={analysis.toneAnalysis.score}>
          <p className="text-sm text-muted-foreground">{analysis.toneAnalysis.feedback}</p>
        </SubScore>
        <SubScore title="ATS readiness" score={analysis.atsOptimization.score}>
          <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
            {analysis.atsOptimization.suggestions.map((suggestion, i) => (
              <li key={i}>{suggestion}</li>
            ))}
          </ul>
        </SubScore>
      </div>
    </div>
  );
};
