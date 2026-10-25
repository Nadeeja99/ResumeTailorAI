import { useState } from 'react';
import {
  BookOpen, Brain, Briefcase, ChevronDown, Lightbulb, MessageSquare, Users, Zap, type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DIFFICULTY_TONE } from '@/lib/score';
import { cn } from '@/lib/utils';
import type { InterviewQuestion } from '@/services/resumeApi';

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Behavioral: Users,
  Technical: Brain,
  Situational: Zap,
  'Culture Fit': Briefcase,
  Leadership: BookOpen,
};

interface QuestionCardProps {
  q: InterviewQuestion;
  index: number;
  visible: boolean;
}

export function QuestionCard({ q, index, visible }: QuestionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const CategoryIcon = CATEGORY_ICONS[q.category] ?? MessageSquare;
  const bodyId = `question-${q.id}-body`;

  return (
    <div
      className="overflow-hidden rounded-lg border bg-card transition-all duration-500 motion-reduce:transition-none"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        transitionDelay: `${index * 60}ms`,
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        aria-expanded={expanded}
        aria-controls={bodyId}
        className="flex w-full items-start gap-4 p-5 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium tabular-nums">
          {q.id}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug">{q.question}</p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="font-normal">
              <CategoryIcon className="h-3 w-3 text-muted-foreground" aria-hidden />
              {q.category}
            </Badge>
            <Badge variant={DIFFICULTY_TONE[q.difficulty] ?? 'outline'} className="font-normal">
              {q.difficulty}
            </Badge>
            <span className="text-xs text-muted-foreground">{q.whyAsked}</span>
          </div>
        </div>

        <ChevronDown
          className={cn('mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform', expanded && 'rotate-180')}
          aria-hidden
        />
      </button>

      {expanded && (
        <div id={bodyId} className="space-y-5 border-t px-5 pb-5 pt-4">
          <div>
            <h4 className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <BookOpen className="h-3.5 w-3.5" aria-hidden /> Ideal answer
            </h4>
            <p className="rounded-md bg-muted/50 p-4 text-sm leading-relaxed">{q.idealAnswer}</p>
          </div>

          {q.tips.length > 0 && (
            <div>
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Lightbulb className="h-3.5 w-3.5" aria-hidden /> Tips
              </h4>
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground marker:text-primary">
                {q.tips.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
