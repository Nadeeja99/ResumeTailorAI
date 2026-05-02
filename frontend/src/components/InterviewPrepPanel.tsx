import { useState } from 'react';
import { generateInterviewPrep, type InterviewPrepResult, type InterviewQuestion } from '@/services/resumeApi';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  Loader2, ChevronDown, ChevronUp, Lightbulb,
  BookOpen, Brain, Users, Briefcase, Zap, MessageSquare,
} from 'lucide-react';

interface Props {
  resume: string;
  jobDescription: string;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Behavioral: <Users className="w-3.5 h-3.5" />,
  Technical: <Brain className="w-3.5 h-3.5" />,
  Situational: <Zap className="w-3.5 h-3.5" />,
  'Culture Fit': <Briefcase className="w-3.5 h-3.5" />,
  Leadership: <BookOpen className="w-3.5 h-3.5" />,
};

const DIFFICULTY_STYLES: Record<string, string> = {
  Easy: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700',
  Medium: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700',
  Hard: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700',
};

const CATEGORY_STYLES: Record<string, string> = {
  Behavioral: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300',
  Technical: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  Situational: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  'Culture Fit': 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300',
  Leadership: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300',
};

function QuestionCard({ q, index, visible }: { q: InterviewQuestion; index: number; visible: boolean }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden transition-all duration-500"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transitionDelay: `${index * 80}ms`,
      }}
    >
      {/* Question header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full text-left p-5 flex items-start gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        {/* Number bubble */}
        <span className="shrink-0 w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 text-sm font-bold flex items-center justify-center">
          {q.id}
        </span>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">{q.question}</p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_STYLES[q.category] ?? 'bg-gray-100 text-gray-600'}`}>
              {CATEGORY_ICONS[q.category] ?? <MessageSquare className="w-3.5 h-3.5" />}
              {q.category}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${DIFFICULTY_STYLES[q.difficulty] ?? ''}`}>
              {q.difficulty}
            </span>
            <span className="text-xs text-gray-400 italic">{q.whyAsked}</span>
          </div>
        </div>

        <span className="shrink-0 text-gray-400 mt-1">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-700 px-5 pb-5 pt-4 space-y-4">
          {/* Ideal answer */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> Ideal Answer
            </h4>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-700/40 rounded-xl p-4">
              {q.idealAnswer}
            </p>
          </div>

          {/* Tips */}
          {q.tips.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" /> Tips
              </h4>
              <ul className="space-y-1.5">
                {q.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <span className="text-amber-500 mt-0.5 shrink-0">→</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const ALL = 'All';
const CATEGORIES = [ALL, 'Behavioral', 'Technical', 'Situational', 'Culture Fit', 'Leadership'];

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
    } catch (err: any) {
      toast({ title: 'Generation Failed', description: err.message || 'Could not generate questions.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  const filtered = result
    ? activeFilter === ALL
      ? result.questions
      : result.questions.filter(q => q.category === activeFilter)
    : [];

  const stats = result
    ? {
        Easy: result.questions.filter(q => q.difficulty === 'Easy').length,
        Medium: result.questions.filter(q => q.difficulty === 'Medium').length,
        Hard: result.questions.filter(q => q.difficulty === 'Hard').length,
      }
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Interview Prep</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            AI generates 8 targeted questions with ideal answers based on the job description and your background.
          </p>
          {result && (
            <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 mt-1">
              Role: {result.roleTitle}
            </p>
          )}
        </div>
        <Button
          onClick={generate}
          disabled={loading}
          className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating…</>
          ) : result ? (
            'Regenerate'
          ) : (
            'Generate Questions'
          )}
        </Button>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 animate-pulse">
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {result && !loading && (
        <>
          {/* Difficulty summary */}
          {stats && (
            <div className="flex flex-wrap gap-3">
              {(['Easy', 'Medium', 'Hard'] as const).map(d => (
                <div key={d} className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium ${DIFFICULTY_STYLES[d]}`}>
                  <span>{stats[d]}</span>
                  <span>{d}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-300">
                {result.questions.length} total
              </div>
            </div>
          )}

          {/* Category filter */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.filter(c => c === ALL || result.questions.some(q => q.category === c)).map(cat => (
              <button
                key={cat}
                onClick={() => setActiveFilter(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                  activeFilter === cat
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-indigo-400'
                }`}
              >
                {cat === ALL ? `All (${result.questions.length})` : `${cat} (${result.questions.filter(q => q.category === cat).length})`}
              </button>
            ))}
          </div>

          {/* Question cards */}
          <div className="space-y-3">
            {filtered.map((q, i) => (
              <QuestionCard
                key={q.id}
                q={q}
                index={i}
                visible={q.id <= visibleCount}
              />
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-8">No questions in this category.</p>
            )}
          </div>

          {/* Practice tip */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800">
            <Lightbulb className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
            <p className="text-sm text-indigo-700 dark:text-indigo-300">
              <strong>Practice tip:</strong> Use the STAR method (Situation, Task, Action, Result) for behavioral questions. Click each card to reveal the ideal answer and coaching tips.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
