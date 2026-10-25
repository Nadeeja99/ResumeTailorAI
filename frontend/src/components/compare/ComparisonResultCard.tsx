import { Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { COMPARISON_THRESHOLDS, scoreTone, TONE_BG, TONE_TEXT } from '@/lib/score';
import { cn } from '@/lib/utils';
import type { JobComparisonResult } from '@/services/resumeApi';

function BadgeList({ label, items, variant }: { label: string; items: string[]; variant: 'secondary' | 'outline' }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <Badge key={i} variant={variant} className="font-normal">{item}</Badge>
        ))}
      </div>
    </div>
  );
}

export function ComparisonResultCard({ result, rank }: { result: JobComparisonResult; rank: number }) {
  const tone = scoreTone(result.matchScore, COMPARISON_THRESHOLDS);

  return (
    <div className="space-y-4 rounded-md border p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          {rank === 0 && (
            <Badge variant="success">
              <Trophy className="h-3 w-3" aria-hidden /> Best match
            </Badge>
          )}
          <p className="truncate font-medium">{result.title || `Job ${rank + 1}`}</p>
        </div>
        <span className={cn('text-2xl font-semibold tabular-nums', TONE_TEXT[tone])}>{result.matchScore}%</span>
      </div>

      <Progress value={result.matchScore} indicatorClassName={TONE_BG[tone]} />
      <BadgeList label="Strengths" items={result.strengths} variant="secondary" />
      <BadgeList label="Missing keywords" items={result.missingKeywords?.slice(0, 6)} variant="outline" />

      {result.topSuggestion && (
        <p className="rounded-md bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Top suggestion: </span>
          {result.topSuggestion}
        </p>
      )}
    </div>
  );
}
