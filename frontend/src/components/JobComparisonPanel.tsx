import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Kbd } from '@/components/common/Kbd';
import { RequestError } from '@/components/common/RequestError';
import { LimitedTextarea } from '@/components/inputs/LimitedTextarea';
import { useAITask } from '@/hooks/useAI';
import { SUBMIT_SHORTCUT_LABEL, useSubmitShortcut } from '@/hooks/useSubmitShortcut';
import { compareJobs, type JobComparisonResult } from '@/services/resumeApi';
import { isValidLength, LIMITS } from '@/lib/limits';
import { ComparisonResultCard } from '@/components/compare/ComparisonResultCard';
import { Plus, Trash2, BarChart2 } from 'lucide-react';
import { CancelButton } from '@/components/ai/CancelButton';
import { TelemetryDrawer } from '@/components/ai/telemetry/TelemetryDrawer';

interface JobEntry {
  id: string;
  title: string;
  description: string;
}

interface JobComparisonPanelProps {
  resume: string;
}

const newJob = (): JobEntry => ({ id: crypto.randomUUID(), title: '', description: '' });

export const JobComparisonPanel = ({ resume }: JobComparisonPanelProps) => {
  const [jobs, setJobs] = useState<JobEntry[]>(() => [newJob()]);
  const task = useAITask<{ results: JobComparisonResult[] }>();

  const results = useMemo(
    () => [...(task.data?.results ?? [])].sort((a, b) => b.matchScore - a.matchScore),
    [task.data]
  );
  const validJobs = jobs.filter(j => isValidLength(j.description, LIMITS.jobDescription));
  const hasInvalidJob = jobs.some(j => j.description.trim() && !isValidLength(j.description, LIMITS.jobDescription));
  const canCompare = validJobs.length > 0 && !hasInvalidJob && !task.isPending;

  const removeJob = (id: string) => setJobs(prev => (prev.length === 1 ? prev : prev.filter(j => j.id !== id)));
  const updateJob = (id: string, field: 'title' | 'description', value: string) =>
    setJobs(prev => prev.map(j => (j.id === id ? { ...j, [field]: value } : j)));

  const compare = () => {
    if (!canCompare) return;
    void task.run(signal => compareJobs(resume, validJobs, { signal }));
  };
  const onKeyDown = useSubmitShortcut(compare);

  return (
    <div className="space-y-6">
      <Card onKeyDown={onKeyDown}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-muted-foreground" aria-hidden />
            Compare jobs
          </CardTitle>
          <CardDescription>
            Add up to {LIMITS.maxJobs} job descriptions to see which role fits your resume best.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {jobs.map((job, idx) => (
            <div key={job.id} className="space-y-3 rounded-md border p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Job {idx + 1}</span>
                {jobs.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeJob(job.id)}
                    aria-label={`Remove job ${idx + 1}`}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 />
                  </Button>
                )}
              </div>
              <Input
                value={job.title}
                maxLength={LIMITS.jobTitle.max}
                aria-label={`Job ${idx + 1} title`}
                onChange={e => updateJob(job.id, 'title', e.target.value)}
                placeholder="Job title (e.g. Senior Frontend Engineer)"
              />
              <LimitedTextarea
                id={`job-${job.id}`}
                label={`Job ${idx + 1} description`}
                value={job.description}
                onChange={value => updateJob(job.id, 'description', value)}
                rule={LIMITS.jobDescription}
                placeholder="Paste the job description…"
                className="min-h-[150px]"
              />
            </div>
          ))}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setJobs(prev => [...prev, newJob()])}
              disabled={jobs.length >= LIMITS.maxJobs}
            >
              <Plus /> Add job
            </Button>
            {task.isPending ? (
              <CancelButton startedAt={task.startedAt} onCancel={task.abort} className="sm:ml-auto" />
            ) : (
              <Button onClick={compare} disabled={!canCompare} className="sm:ml-auto">
                <BarChart2 /> Compare {validJobs.length > 1 ? `${validJobs.length} jobs` : ''}
                <Kbd className="ml-1 hidden border-primary-foreground/30 bg-transparent text-primary-foreground/80 sm:inline-flex">
                  {SUBMIT_SHORTCUT_LABEL}
                </Kbd>
              </Button>
            )}
          </div>
          {task.status === 'error' && task.error && <RequestError error={task.error} onRetry={compare} telemetry={task.telemetry} />}
        </CardContent>
      </Card>

      {task.isPending && (
        <Card className="space-y-4 p-6" aria-busy="true" aria-label="Comparing jobs">
          {validJobs.map(job => (
            <div key={job.id} className="space-y-3 rounded-md border p-5">
              <div className="flex justify-between">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-7 w-14" />
              </div>
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </Card>
      )}

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
            <CardDescription>Sorted by match score, best first.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {results.map((r, idx) => (
              <ComparisonResultCard key={r.id} result={r} rank={idx} />
            ))}
          </CardContent>
        </Card>
      )}

      {results.length > 0 && <TelemetryDrawer telemetry={task.telemetry} timing={task.timing} />}
    </div>
  );
};
