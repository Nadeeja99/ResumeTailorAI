import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { AppShell } from '@/components/layout/AppShell';
import { EmptyState } from '@/components/common/EmptyState';
import { ResumeInput } from '@/components/ResumeInput';
import { JobDescriptionInput } from '@/components/JobDescriptionInput';
import { AnalysisResults } from '@/components/AnalysisResults';
import { ResumePreview } from '@/components/ResumePreview';
import { ResumeDiff } from '@/components/ResumeDiff';
import { CoverLetterPanel } from '@/components/CoverLetterPanel';
import { JobComparisonPanel } from '@/components/JobComparisonPanel';
import SemanticAnalysis from '@/components/SemanticAnalysis';
import PricingModal from '@/components/PricingModal';
import UsageBanner from '@/components/UsageBanner';
import InterviewPrepPanel from '@/components/InterviewPrepPanel';
import { analyzeResume, generateImprovedResume, type AnalysisResult } from '@/services/resumeApi';
import { fetchUsageStatus, type UsageStatus } from '@/lib/userStore';
import { getErrorMessage } from '@/lib/utils';
import { Sparkles, Target, FileText, Loader2, GitCompare, BarChart2, BrainCircuit, MessageSquare } from 'lucide-react';

// Underline-style primary navigation; scrolls horizontally on narrow screens.
const NAV_LIST =
  'mb-8 h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b bg-transparent p-0 scrollbar-none';
const NAV_TRIGGER =
  '-mb-px flex-none gap-2 rounded-none border-b-2 border-transparent px-3 pb-3 pt-2 text-muted-foreground hover:text-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none';

const MAIN_TABS = [
  { value: 'optimizer', label: 'Optimizer', icon: Target },
  { value: 'semantic', label: 'Semantic match', icon: BrainCircuit },
  { value: 'interview', label: 'Interview prep', icon: MessageSquare },
  { value: 'cover-letter', label: 'Cover letter', icon: FileText },
  { value: 'compare', label: 'Compare jobs', icon: BarChart2 },
];

const STEPS = [
  { title: 'Add your resume', desc: 'Paste it, upload a PDF/DOCX, or import your LinkedIn profile.' },
  { title: 'Add the job description', desc: 'Paste the posting or upload it as a file.' },
  { title: 'Analyze and tailor', desc: 'Get a match score and keyword gaps, then stream a tailored rewrite.' },
];

const needsInputs = (what: string) => `Add your ${what} on the Optimizer tab to unlock this tool.`;

const Index = () => {
  const [resume, setResume] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [improvedResume, setImprovedResume] = useState('');
  const [activeResultTab, setActiveResultTab] = useState('preview');
  const [usageStatus, setUsageStatus] = useState<UsageStatus | null>(null);
  const [pricingOpen, setPricingOpen] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsageStatus()
      .then(setUsageStatus)
      .catch(() => {}); // non-critical — silently ignore if backend unavailable
  }, []);

  // Refresh usage after a successful analysis
  function refreshUsage() {
    fetchUsageStatus().then(setUsageStatus).catch(() => {});
  }

  // ── Local heuristic fallback ─────────────────────────────────────────────

  const heuristicAnalyze = (resumeText: string, jdText: string): AnalysisResult => {
    const tokenize = (t: string) =>
      Array.from(new Set(t.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean)));

    const resumeTokens = tokenize(resumeText);
    const jdTokens = tokenize(jdText);
    const important = jdTokens.filter(t => t.length > 3);
    const common = important.filter(t => resumeTokens.includes(t));
    const missing = important.filter(t => !resumeTokens.includes(t)).slice(0, 25);
    const matchScore = important.length > 0 ? Math.min(100, Math.round((common.length / important.length) * 100)) : 0;

    const skillHints = ['react', 'typescript', 'javascript', 'node', 'python', 'java', 'aws', 'gcp', 'azure', 'sql', 'docker', 'kubernetes'];
    const strengthsTokens = common.filter(t => skillHints.includes(t));
    const strengths = strengthsTokens.length > 0
      ? strengthsTokens.slice(0, 6).map(s => `Matched skill: ${s}`)
      : ['Found overlap between your experience and the role.'];

    return {
      matchScore,
      missingKeywords: missing,
      suggestedImprovements: [
        missing.length > 0 ? `Add missing keywords: ${missing.slice(0, 8).join(', ')}` : 'Keyword coverage looks good.',
        'Quantify achievements with metrics (%, $, time saved).',
        'Start bullets with strong action verbs.',
        'Align section order with job priorities.',
      ],
      strengths,
      toneAnalysis: {
        score: Math.min(100, Math.max(40, 60 + Math.floor(resumeText.length / 2000) * 5)),
        feedback: 'Use concise bullets, avoid first-person, keep formatting consistent.',
      },
      atsOptimization: {
        score: Math.min(100, Math.max(40, 70 - (resumeText.match(/\t|\|/g)?.length ?? 0) * 5)),
        suggestions: [
          'Use standard headings: Experience, Education, Skills.',
          'Avoid tables, text boxes, and complex layouts.',
          'Keep bullet styles and fonts simple.',
        ],
      },
    };
  };

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleAnalyze = async () => {
    if (!resume.trim() || !jobDescription.trim()) {
      toast({ title: 'Missing Information', description: 'Please provide both resume and job description.', variant: 'destructive' });
      return;
    }
    setIsAnalyzing(true);
    setAnalysis(null);
    setImprovedResume('');
    try {
      const result = await analyzeResume(resume, jobDescription);
      setAnalysis(result);
      refreshUsage();
      toast({ title: 'Analysis Complete', description: 'Your resume has been analyzed.' });
    } catch (err) {
      const message = getErrorMessage(err, '');
      if (message.includes('USAGE_LIMIT_REACHED') || message.includes('Monthly limit reached')) {
        setPricingOpen(true);
        setIsAnalyzing(false);
        return;
      }
      console.warn('AI analysis failed, using heuristic fallback:', err);
      setAnalysis(heuristicAnalyze(resume, jobDescription));
      toast({ title: 'Using Local Analysis', description: 'AI unavailable — generated a heuristic result.' });
    } finally {
      setIsAnalyzing(false);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  };

  const handleGenerate = async () => {
    if (!analysis) {
      toast({ title: 'Analyze First', description: 'Please run the analysis before generating.', variant: 'destructive' });
      return;
    }
    setIsGenerating(true);
    setImprovedResume('');
    setActiveResultTab('preview');
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    try {
      await generateImprovedResume(resume, jobDescription, analysis.suggestedImprovements, chunk => {
        setImprovedResume(prev => prev + chunk);
      });
      toast({ title: 'Resume Optimized', description: 'Your improved resume is ready to preview and download.' });
    } catch (err) {
      toast({ title: 'Generation Failed', description: getErrorMessage(err, 'Could not reach the AI service. Is the backend running?'), variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const hasInputs = Boolean(resume.trim() && jobDescription.trim());

  return (
    <AppShell>
      <PricingModal
        open={pricingOpen}
        onClose={() => setPricingOpen(false)}
        usageCount={usageStatus?.usageCount ?? 0}
        usageLimit={usageStatus?.usageLimit ?? 3}
      />

      <section className="mb-10 max-w-2xl">
        <p className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary">
          <Sparkles className="h-3.5 w-3.5" aria-hidden /> AI resume tailoring
        </p>
        <h1 className="text-3xl font-semibold sm:text-4xl">Tailor your resume to every role</h1>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Score your fit against a job description, close keyword gaps, and generate a tailored resume, cover letter
          and interview prep — streamed in real time.
        </p>
      </section>

      {usageStatus && (
        <div className="mb-8">
          <UsageBanner status={usageStatus} onUpgradeClick={() => setPricingOpen(true)} />
        </div>
      )}

      <Tabs defaultValue="optimizer" className="w-full">
        <TabsList className={NAV_LIST}>
          {MAIN_TABS.map(({ value, label, icon: Icon }) => (
            <TabsTrigger key={value} value={value} className={NAV_TRIGGER}>
              <Icon className="h-4 w-4" aria-hidden /> {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Optimizer ─────────────────────────────────────────────── */}
        <TabsContent value="optimizer" className="mt-0 space-y-10">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ResumeInput resume={resume} onResumeChange={setResume} />
            <JobDescriptionInput jobDescription={jobDescription} onJobDescriptionChange={setJobDescription} />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button onClick={handleAnalyze} disabled={isAnalyzing || !hasInputs} size="lg" className="w-full sm:w-auto">
              {isAnalyzing ? <Loader2 className="animate-spin" /> : <Target />}
              {isAnalyzing ? 'Analyzing…' : 'Analyze resume'}
            </Button>
            {analysis && (
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                variant="outline"
                size="lg"
                className="w-full sm:w-auto"
              >
                {isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles />}
                {isGenerating ? 'Writing…' : 'Generate tailored resume'}
              </Button>
            )}
            {!hasInputs && (
              <p className="text-sm text-muted-foreground">Add a resume and a job description to begin.</p>
            )}
          </div>

          {analysis ? (
            <div ref={resultsRef} className="scroll-mt-20 space-y-8">
              <AnalysisResults analysis={analysis} isLoading={isAnalyzing} />

              {(improvedResume || isGenerating) && (
                <Tabs value={activeResultTab} onValueChange={setActiveResultTab}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="preview" className="gap-2">
                      <FileText className="h-4 w-4" /> Preview & download
                    </TabsTrigger>
                    {improvedResume && !isGenerating && (
                      <TabsTrigger value="diff" className="gap-2">
                        <GitCompare className="h-4 w-4" /> Changes
                      </TabsTrigger>
                    )}
                  </TabsList>

                  <TabsContent value="preview">
                    <ResumePreview
                      resume={improvedResume}
                      isStreaming={isGenerating}
                      suggestions={improvedResume && !isGenerating ? analysis.suggestedImprovements : []}
                    />
                  </TabsContent>

                  {improvedResume && !isGenerating && (
                    <TabsContent value="diff">
                      <ResumeDiff original={resume} improved={improvedResume} />
                    </TabsContent>
                  )}
                </Tabs>
              )}

              {!improvedResume && !isGenerating && <ResumePreview resume={resume} isStreaming={false} />}
            </div>
          ) : (
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
        </TabsContent>

        {/* ── Semantic ──────────────────────────────────────────────── */}
        <TabsContent value="semantic" className="mt-0">
          {hasInputs ? (
            <SemanticAnalysis resume={resume} jobDescription={jobDescription} onUpgradeClick={() => setPricingOpen(true)} />
          ) : (
            <EmptyState icon={BrainCircuit} title="Resume and job description needed" description={needsInputs('resume and job description')} />
          )}
        </TabsContent>

        {/* ── Interview prep ────────────────────────────────────────── */}
        <TabsContent value="interview" className="mt-0">
          {hasInputs ? (
            <InterviewPrepPanel resume={resume} jobDescription={jobDescription} />
          ) : (
            <EmptyState icon={MessageSquare} title="Resume and job description needed" description={needsInputs('resume and job description')} />
          )}
        </TabsContent>

        {/* ── Cover letter ──────────────────────────────────────────── */}
        <TabsContent value="cover-letter" className="mt-0">
          {hasInputs ? (
            <CoverLetterPanel resume={resume} jobDescription={jobDescription} />
          ) : (
            <EmptyState icon={FileText} title="Resume and job description needed" description={needsInputs('resume and job description')} />
          )}
        </TabsContent>

        {/* ── Compare jobs ──────────────────────────────────────────── */}
        <TabsContent value="compare" className="mt-0">
          {resume.trim() ? (
            <JobComparisonPanel resume={resume} />
          ) : (
            <EmptyState icon={BarChart2} title="Resume needed" description={needsInputs('resume')} />
          )}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
};

export default Index;
