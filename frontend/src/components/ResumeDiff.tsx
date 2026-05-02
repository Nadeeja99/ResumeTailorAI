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
    <Card className="bg-gradient-card shadow-md border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitCompare className="w-5 h-5 text-primary" />
          Resume Diff
        </CardTitle>
        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm bg-green-200 dark:bg-green-900" /> Added
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm bg-red-200 dark:bg-red-900" /> Removed
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 text-sm leading-relaxed font-mono whitespace-pre-wrap max-h-[600px] overflow-y-auto">
          {parts.map((part, i) => {
            if (part.added) {
              return (
                <mark
                  key={i}
                  className="bg-green-100 dark:bg-green-900/50 text-green-900 dark:text-green-100 rounded px-0.5"
                >
                  {part.value}
                </mark>
              );
            }
            if (part.removed) {
              return (
                <del
                  key={i}
                  className="bg-red-100 dark:bg-red-900/50 text-red-900 dark:text-red-100 rounded px-0.5 line-through opacity-70"
                >
                  {part.value}
                </del>
              );
            }
            return <span key={i} className="text-foreground">{part.value}</span>;
          })}
        </div>
      </CardContent>
    </Card>
  );
};
