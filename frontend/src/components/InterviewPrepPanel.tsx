import { useState } from 'react';
import { Lightbulb, Loader2, MessageSquare } from 'lucide-react';
import { cn, getErrorMessage } from '@/lib/utils';
import { generateInterviewPrep, type InterviewPrepResult } from '@/services/resumeApi';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { QuestionCard } from '@/components/interview/QuestionCard';
import { DIFFICULTY_TONE } from '@/lib/score';

interface Props {
  resume: string;
  jobDescription: string;
}

const ALL = 'All';
const CATEGORIES = [ALL, 'Behavioral', 'Technical', 'Situational', 'Culture Fit', 'Leadership'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'] as const;

export default function InterviewPrepPanel({ resume, jobDescription }: Props) {
  const [result, setResult] = useState<InterviewPrepResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);
  const [activeFilter, setActiveFilter] = useState(ALL);
  const { toast } = useToast();

  async function generate() {
    setLoading(true);
    setResult(null);
    setVisibleCount(0);
    setActiveFilter(ALL);
    try {
      const data = await generateInterviewPrep(resume, jobDescription);
      setResult(data);
      // Reveal cards one by one with staggered timing
      let count = 0;
      const interval = setInterval(() => {
        count++;
        setVisibleCount(count);
        if (count >= data.questions.length) clearInterval(interval);
      }, 100);
    } catch (err) {
      toast({ title: 'Generation Failed', description: getErrorMessage(err, 'Could not generate questions.'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
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
          <Button onClick={generate} disabled={loading} className="shrink-0">
            {loading && <Loader2 className="animate-spin" />}
            {loading ? 'Generating…' : result ? 'Regenerate' : 'Generate questions'}
          </Button>
        </CardHeader>
      </Card>

      {loading && (
        <div className="space-y-3" aria-busy="true" aria-label="Generating questions">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex animate-pulse items-start gap-4 rounded-lg border bg-card p-5">
              <div className="h-7 w-7 shrink-0 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 rounded bg-muted" />
                <div className="h-3 w-1/2 rounded bg-muted" />
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
