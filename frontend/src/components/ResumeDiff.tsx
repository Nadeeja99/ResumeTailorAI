import { diffWords } from 'diff';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GitCompare } from 'lucide-react';

interface ResumeDiffProps {
  original: string;
  improved: string;
}

export const ResumeDiff = ({ original, improved }: ResumeDiffProps) => {
  const parts = diffWords(original, improved);

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2">
          <GitCompare className="h-4 w-4 text-muted-foreground" aria-hidden />
          Changes
        </CardTitle>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-success/30" /> Added
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-destructive/30" /> Removed
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="max-h-[600px] overflow-y-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-6 font-mono text-sm leading-relaxed">
          {parts.map((part, i) => {
            if (part.added) {
              return (
                <mark key={i} className="rounded-sm bg-success/15 px-0.5 text-success">
                  {part.value}
                </mark>
              );
            }
            if (part.removed) {
              return (
                <del key={i} className="rounded-sm bg-destructive/10 px-0.5 text-destructive line-through opacity-80">
                  {part.value}
                </del>
              );
            }
            return <span key={i}>{part.value}</span>;
          })}
        </div>
      </CardContent>
    </Card>
  );
};
