import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { compareJobs, JobComparisonResult } from '@/services/resumeApi';
import { Plus, Trash2, BarChart2, RefreshCw, TrendingUp } from 'lucide-react';

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
    } catch (error: any) {
      toast({ title: 'Comparison Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsComparing(false);
    }
  };

  const scoreColor = (score: number) =>
    score >= 75 ? 'text-green-600' : score >= 50 ? 'text-yellow-600' : 'text-red-600';

  const scoreBarColor = (score: number) =>
    score >= 75 ? 'bg-green-500' : score >= 50 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-card shadow-md border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-primary" />
            Compare Multiple Jobs
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Add up to 5 job descriptions to see which role fits your resume best.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {jobs.map((job, idx) => (
            <div key={job.id} className="border border-border/50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-muted-foreground">Job {idx + 1}</span>
                {jobs.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => removeJob(job.id)} className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
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
                placeholder="Paste the job description..."
                className="min-h-[150px] resize-none"
              />
            </div>
          ))}

          <div className="flex gap-3">
            <Button variant="outline" onClick={addJob} disabled={jobs.length >= 5} className="flex-1">
              <Plus className="w-4 h-4 mr-2" /> Add Job
            </Button>
            <Button
              onClick={compare}
              disabled={isComparing || !resume.trim()}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isComparing ? (
                <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Comparing...</>
              ) : (
                <><BarChart2 className="w-4 h-4 mr-2" /> Compare</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card className="bg-gradient-card shadow-md border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Results — Best Match First
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {results.map((r, idx) => (
              <div key={r.id} className="border border-border/50 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {idx === 0 && <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">Best Match</Badge>}
                    <span className="font-semibold">{r.title || `Job ${idx + 1}`}</span>
                  </div>
                  <span className={`text-2xl font-bold ${scoreColor(r.matchScore)}`}>{r.matchScore}%</span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Match Score</span><span>{r.matchScore}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${scoreBarColor(r.matchScore)}`}
                      style={{ width: `${r.matchScore}%` }}
                    />
                  </div>
                </div>

                {r.strengths?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Strengths</p>
                    <div className="flex flex-wrap gap-1">
                      {r.strengths.map((s, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {r.missingKeywords?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Missing Keywords</p>
                    <div className="flex flex-wrap gap-1">
                      {r.missingKeywords.slice(0, 6).map((k, i) => (
                        <Badge key={i} variant="outline" className="text-xs text-destructive border-destructive/30">{k}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {r.topSuggestion && (
                  <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                    Tip: {r.topSuggestion}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
