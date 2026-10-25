import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { compareJobs, JobComparisonResult } from '@/services/resumeApi';
import { COMPARISON_THRESHOLDS, scoreTone, TONE_BG, TONE_TEXT } from '@/lib/score';
import { cn, getErrorMessage } from '@/lib/utils';
import { Plus, Trash2, BarChart2, RefreshCw, Trophy } from 'lucide-react';

interface JobEntry {
  id: string;
  title: string;
  description: string;
}

interface JobComparisonPanelProps {
  resume: string;
}

export const JobComparisonPanel = ({ resume }: JobComparisonPanelProps) => {
  const [jobs, setJobs] = useState<JobEntry[]>([
    { id: crypto.randomUUID(), title: '', description: '' },
  ]);
  const [results, setResults] = useState<JobComparisonResult[]>([]);
  const [isComparing, setIsComparing] = useState(false);
  const { toast } = useToast();

  const addJob = () => {
    if (jobs.length >= 5) {
      toast({ title: 'Limit reached', description: 'Maximum 5 job descriptions for comparison.' });
      return;
    }
    setJobs(prev => [...prev, { id: crypto.randomUUID(), title: '', description: '' }]);
  };

  const removeJob = (id: string) => {
    if (jobs.length === 1) return;
    setJobs(prev => prev.filter(j => j.id !== id));
  };

  const updateJob = (id: string, field: 'title' | 'description', value: string) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, [field]: value } : j));
  };

  const compare = async () => {
    if (!resume.trim()) {
      toast({ title: 'No Resume', description: 'Please add your resume on the main tab first.', variant: 'destructive' });
      return;
    }
    const validJobs = jobs.filter(j => j.description.trim().length >= 20);
    if (validJobs.length === 0) {
      toast({ title: 'No Job Descriptions', description: 'Add at least one job description (20+ characters).', variant: 'destructive' });
      return;
    }

    setIsComparing(true);
    setResults([]);
    try {
      const { results: data } = await compareJobs(resume, validJobs);
      setResults(data.sort((a, b) => b.matchScore - a.matchScore));
      toast({ title: 'Comparison Complete', description: `Compared against ${data.length} job${data.length > 1 ? 's' : ''}.` });
    } catch (error) {
      toast({ title: 'Comparison Failed', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setIsComparing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-muted-foreground" aria-hidden />
            Compare jobs
          </CardTitle>
          <CardDescription>Add up to 5 job descriptions to see which role fits your resume best.</CardDescription>
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
                onChange={e => updateJob(job.id, 'title', e.target.value)}
                placeholder="Job title (e.g. Senior Frontend Engineer)"
              />
              <Textarea
                value={job.description}
                onChange={e => updateJob(job.id, 'description', e.target.value)}
                placeholder="Paste the job description…"
                className="min-h-[150px] resize-y leading-relaxed"
              />
            </div>
          ))}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="outline" onClick={addJob} disabled={jobs.length >= 5}>
              <Plus /> Add job
            </Button>
            <Button onClick={compare} disabled={isComparing || !resume.trim()} className="sm:ml-auto">
              {isComparing ? <RefreshCw className="animate-spin" /> : <BarChart2 />}
              {isComparing ? 'Comparing…' : 'Compare'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
            <CardDescription>Sorted by match score, best first.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {results.map((r, idx) => {
              const tone = scoreTone(r.matchScore, COMPARISON_THRESHOLDS);
              return (
                <div key={r.id} className="space-y-4 rounded-md border p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 space-y-1">
                      {idx === 0 && (
                        <Badge variant="success">
                          <Trophy className="h-3 w-3" aria-hidden /> Best match
                        </Badge>
                      )}
                      <p className="truncate font-medium">{r.title || `Job ${idx + 1}`}</p>
                    </div>
                    <span className={cn('text-2xl font-semibold tabular-nums', TONE_TEXT[tone])}>{r.matchScore}%</span>
                  </div>

                  <Progress value={r.matchScore} indicatorClassName={TONE_BG[tone]} />

                  {r.strengths?.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-xs font-medium text-muted-foreground">Strengths</p>
                      <div className="flex flex-wrap gap-1.5">
                        {r.strengths.map((s, i) => (
                          <Badge key={i} variant="secondary" className="font-normal">{s}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {r.missingKeywords?.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-xs font-medium text-muted-foreground">Missing keywords</p>
                      <div className="flex flex-wrap gap-1.5">
                        {r.missingKeywords.slice(0, 6).map((k, i) => (
                          <Badge key={i} variant="outline" className="font-normal">{k}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {r.topSuggestion && (
                    <p className="rounded-md bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Top suggestion: </span>
                      {r.topSuggestion}
                    </p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
