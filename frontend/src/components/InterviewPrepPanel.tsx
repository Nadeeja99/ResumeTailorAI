import { useEffect, useState } from 'react';
import { Lightbulb, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { generateInterviewPrep, type InterviewPrepResult } from '@/services/resumeApi';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { RequestError } from '@/components/common/RequestError';
import { CancelButton } from '@/components/ai/CancelButton';
import { TelemetryDrawer } from '@/components/ai/telemetry/TelemetryDrawer';
import { QuestionCard } from '@/components/interview/QuestionCard';
import { useAITask } from '@/hooks/useAI';
import { DIFFICULTY_TONE } from '@/lib/score';

interface Props {
  resume: string;
  jobDescription: string;
}

const ALL = 'All';
const CATEGORIES = [ALL, 'Behavioral', 'Technical', 'Situational', 'Culture Fit', 'Leadership'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'] as const;

export default function InterviewPrepPanel({ resume, jobDescription }: Props) {
  const task = useAITask<InterviewPrepResult>();
  const [visibleCount, setVisibleCount] = useState(0);
  const [activeFilter, setActiveFilter] = useState(ALL);
  const result = task.data;
  const loading = task.isPending;

  // Reveal cards one by one; restarts for each new result and stops on unmount
  useEffect(() => {
    setVisibleCount(0);
    if (!result) return;
    const interval = setInterval(() => {
      setVisibleCount(count => {
        if (count + 1 >= result.questions.length) clearInterval(interval);
        return count + 1;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [result]);

  function generate() {
    setActiveFilter(ALL);
    void task.run(signal => generateInterviewPrep(resume, jobDescription, { signal }));
  }

  const filtered = result
    ? activeFilter === ALL
      ? result.questions
      : result.questions.filter(q => q.category === activeFilter)
    : [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="gap-4 space-y-0 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" aria-hidden />
              Interview prep
            </CardTitle>
            <CardDescription>
              Eight targeted questions with ideal answers, grounded in the job description and your background.
            </CardDescription>
            {result && <p className="text-sm font-medium">Role: {result.roleTitle}</p>}
          </div>
          {loading ? (
            <CancelButton startedAt={task.startedAt} onCancel={task.abort} />
          ) : (
            <Button onClick={generate} className="shrink-0">
              {result ? 'Regenerate' : 'Generate questions'}
            </Button>
          )}
        </CardHeader>
      </Card>

      {task.status === 'error' && task.error && <RequestError error={task.error} onRetry={generate} telemetry={task.telemetry} />}

      {loading && (
        <div className="space-y-3" aria-busy="true" aria-label="Generating questions">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start gap-4 rounded-lg border bg-card p-5">
              <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {result && !loading && (
        <>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-1 rounded-md border bg-card p-1">
              {CATEGORIES.filter(c => c === ALL || result.questions.some(q => q.category === c)).map(cat => {
                const count = cat === ALL ? result.questions.length : result.questions.filter(q => q.category === cat).length;
                return (
                  <button
                    key={cat}
                    type="button"
                    aria-pressed={activeFilter === cat}
                    onClick={() => setActiveFilter(cat)}
                    className={cn(
                      'rounded-sm px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      activeFilter === cat ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {cat} <span className="tabular-nums text-muted-foreground">{count}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2">
              {DIFFICULTIES.map(d => (
                <Badge key={d} variant={DIFFICULTY_TONE[d]} className="font-normal tabular-nums">
                  {result.questions.filter(q => q.difficulty === d).length} {d}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filtered.map((q, i) => (
              <QuestionCard key={q.id} q={q} index={i} visible={q.id <= visibleCount} />
            ))}
            {filtered.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No questions in this category.</p>
            )}
          </div>

          <TelemetryDrawer telemetry={task.telemetry} timing={task.timing} />

          <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-4">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Practice tip:</span> use the STAR method (Situation, Task,
              Action, Result) for behavioral questions. Open a card to see the ideal answer and coaching tips.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
