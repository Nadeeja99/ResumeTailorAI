import { useRef, useState } from 'react';
import { Info, Sparkles, Square, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Kbd } from '@/components/common/Kbd';
import { CancelButton } from '@/components/ai/CancelButton';
import { TelemetryDrawer } from '@/components/ai/telemetry/TelemetryDrawer';
import { RequestError } from '@/components/common/RequestError';
import { AnalysisResults } from '@/components/AnalysisResults';
import { JobDescriptionInput } from '@/components/JobDescriptionInput';
import { ResumeInput } from '@/components/ResumeInput';
import { GeneratedResume } from '@/components/optimizer/GeneratedResume';
import type { ResumeSource } from '@/components/preview/OriginalResume';
import { useAIStream, useAITask } from '@/hooks/useAI';
import { SUBMIT_SHORTCUT_LABEL, useSubmitShortcut } from '@/hooks/useSubmitShortcut';
import { heuristicAnalyze } from '@/lib/heuristicAnalysis';
import { isValidLength, LIMITS } from '@/lib/limits';
import {
  analyzeResume, ApiError, generateImprovedResume, isUsageLimitError, type AnalysisResult,
} from '@/services/resumeApi';

interface OptimizerTabProps {
  resume: string;
  /** Uploaded PDF behind the resume text, if any. */
  resumeSource: ResumeSource | null;
  onResumeSourceChange: (source: ResumeSource | null) => void;
  jobDescription: string;
  onResumeChange: (value: string) => void;
  onJobDescriptionChange: (value: string) => void;
  onAnalyzed: () => void;
  onUsageLimit: () => void;
}

const STEPS = [
  { title: 'Add your resume', desc: 'Paste it, upload a PDF/DOCX, or import your LinkedIn profile.' },
  { title: 'Add the job description', desc: 'Paste the posting or upload it as a file.' },
  { title: 'Analyze and tailor', desc: 'Get a match score and keyword gaps, then stream a tailored rewrite.' },
];

// Only fall back to the offline heuristic when the AI is unreachable — not for validation or rate-limit errors.
const shouldUseHeuristic = (error: Error) => !(error instanceof ApiError) || error.status === 0 || error.status >= 500;

export function OptimizerTab(props: OptimizerTabProps) {
  const { resume, resumeSource, onResumeSourceChange, jobDescription, onResumeChange, onJobDescriptionChange, onAnalyzed, onUsageLimit } = props;
  const analysisTask = useAITask<AnalysisResult>();
  const generation = useAIStream();
  const [heuristic, setHeuristic] = useState<AnalysisResult | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const analysis = analysisTask.data ?? heuristic;
  const inputsValid = isValidLength(resume, LIMITS.resume) && isValidLength(jobDescription, LIMITS.jobDescription);
  const canAnalyze = inputsValid && !analysisTask.isPending;
  const scrollToResults = () =>
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);

  const handleAnalyze = async () => {
    if (!canAnalyze) return;
    setHeuristic(null);
    generation.reset();
    scrollToResults();
    const outcome = await analysisTask.run(signal => analyzeResume(resume, jobDescription, { signal }));
    if (outcome.status === 'success') {
      onAnalyzed();
    } else if (outcome.status === 'error') {
      if (isUsageLimitError(outcome.error)) onUsageLimit();
      else if (shouldUseHeuristic(outcome.error)) setHeuristic(heuristicAnalyze(resume, jobDescription));
    }
  };

  const handleGenerate = async () => {
    if (!analysis || generation.isPending) return;
    scrollToResults();
    const outcome = await generation.run((signal, onChunk) =>
      generateImprovedResume(resume, jobDescription, analysis.suggestedImprovements, onChunk, { signal })
    );
    if (outcome.status === 'success') toast({ title: 'Tailored resume ready', description: 'Preview, compare and download it below.' });
  };

  const onKeyDown = useSubmitShortcut(handleAnalyze);

  return (
    <div className="space-y-10">
      <div onKeyDown={onKeyDown} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ResumeInput resume={resume} onResumeChange={onResumeChange} onSourceChange={onResumeSourceChange} />
          <JobDescriptionInput jobDescription={jobDescription} onJobDescriptionChange={onJobDescriptionChange} />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {analysisTask.isPending ? (
            <CancelButton size="lg" startedAt={analysisTask.startedAt} onCancel={analysisTask.abort} label="Cancel analysis" className="w-full sm:w-auto" />
          ) : (
            <Button onClick={handleAnalyze} disabled={!canAnalyze} size="lg" className="w-full sm:w-auto">
              <Target /> Analyze resume
              <Kbd className="ml-1 hidden border-primary-foreground/30 bg-transparent text-primary-foreground/80 sm:inline-flex">
                {SUBMIT_SHORTCUT_LABEL}
              </Kbd>
            </Button>
          )}

          {analysis &&
            (generation.isPending ? (
              <Button variant="outline" size="lg" onClick={generation.abort} className="w-full sm:w-auto">
                <Square className="fill-current" /> Stop writing
              </Button>
            ) : (
              <Button variant="outline" size="lg" onClick={handleGenerate} className="w-full sm:w-auto">
                <Sparkles /> {generation.text ? 'Regenerate' : 'Generate tailored resume'}
              </Button>
            ))}

          {!inputsValid && !analysis && (
            <p className="text-sm text-muted-foreground">Add a resume and a job description to begin.</p>
          )}
        </div>
      </div>

      <div ref={resultsRef} className="scroll-mt-20 space-y-8">
        {analysisTask.status === 'error' && analysisTask.error && !heuristic && !isUsageLimitError(analysisTask.error) && (
          <RequestError error={analysisTask.error} onRetry={handleAnalyze} telemetry={analysisTask.telemetry} />
        )}

        {heuristic && (
          <div role="status" className="flex flex-col gap-3 rounded-md border bg-muted/40 p-4 sm:flex-row sm:items-center">
            <Info className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <p className="flex-1 text-sm">
              <span className="font-medium">AI unavailable — showing a local keyword analysis.</span>{' '}
              <span className="text-muted-foreground">Scores are approximate.</span>
            </p>
            <Button variant="outline" size="sm" onClick={handleAnalyze}>
              Retry with AI
            </Button>
          </div>
        )}

        {analysisTask.isPending && <AnalysisResults analysis={null} isLoading />}

        {analysis && !analysisTask.isPending && (
          <>
            <AnalysisResults analysis={analysis} isLoading={false} />
            <TelemetryDrawer
              telemetry={analysisTask.telemetry}
              timing={analysisTask.timing}
              source={heuristic ? 'heuristic' : 'model'}
            />
            <GeneratedResume
              original={resume}
              originalSource={resumeSource}
              stream={generation}
              suggestions={analysis.suggestedImprovements}
              onRetry={handleGenerate}
            />
          </>
        )}

        {!analysis && !analysisTask.isPending && analysisTask.status !== 'error' && (
          <ol className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="rounded-lg border bg-card p-5">
                <span className="mb-3 flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-medium">
                  {i + 1}
                </span>
                <p className="text-sm font-medium">{step.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{step.desc}</p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
