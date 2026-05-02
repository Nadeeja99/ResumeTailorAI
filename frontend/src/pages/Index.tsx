import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
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
import { Sparkles, Target, FileText, RefreshCw, GitCompare, BarChart2, BrainCircuit, MessageSquare } from 'lucide-react';

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
    } catch (err: any) {
      if (err.message?.includes('USAGE_LIMIT_REACHED') || err.message?.includes('Monthly limit reached')) {
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
    } catch (err: any) {
      toast({ title: 'Generation Failed', description: err.message || 'Could not reach the AI service. Is the backend running?', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden selection:bg-primary/20">
      <div className="pointer-events-none absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px] animate-float opacity-70" />
      <div className="pointer-events-none absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-accent/20 blur-[120px] animate-float-delayed opacity-70" />

      {/* Pricing modal */}
      <PricingModal
        open={pricingOpen}
        onClose={() => setPricingOpen(false)}
        usageCount={usageStatus?.usageCount ?? 0}
        usageLimit={usageStatus?.usageLimit ?? 3}
      />

      {/* Hero */}
      <div className="relative pt-24 pb-16 lg:pt-32 lg:pb-24">
        <div className="relative z-10 container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 backdrop-blur-md rounded-full px-5 py-2 mb-8 shadow-sm">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-foreground text-sm font-semibold tracking-wide">AI-Powered Resume Optimization</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold text-foreground mb-6 tracking-tight leading-tight">
              Tailor Your Resume to
              <span className="block bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_auto] animate-pulse bg-clip-text text-transparent pb-2 mt-2">
                Land Your Dream Job
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              AI-powered analysis, semantic embeddings scoring, cover letter generation, and multi-job comparison — all in one place.
            </p>
          </div>
        </div>
      </div>

      {/* Main App Tabs */}
      <div className="container mx-auto px-4 pb-20">
        {/* Usage banner — shown when on free plan */}
        {usageStatus && (
          <div className="mb-6">
            <UsageBanner status={usageStatus} onUpgradeClick={() => setPricingOpen(true)} />
          </div>
        )}

        <Tabs defaultValue="optimizer" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-8 max-w-3xl mx-auto">
            <TabsTrigger value="optimizer" className="flex items-center gap-1 text-xs sm:text-sm">
              <Target className="w-3.5 h-3.5" /> Optimizer
            </TabsTrigger>
            <TabsTrigger value="semantic" className="flex items-center gap-1 text-xs sm:text-sm">
              <BrainCircuit className="w-3.5 h-3.5" /> Semantic
            </TabsTrigger>
            <TabsTrigger value="interview" className="flex items-center gap-1 text-xs sm:text-sm">
              <MessageSquare className="w-3.5 h-3.5" /> Interview
            </TabsTrigger>
            <TabsTrigger value="cover-letter" className="flex items-center gap-1 text-xs sm:text-sm">
              <FileText className="w-3.5 h-3.5" /> Cover Letter
            </TabsTrigger>
            <TabsTrigger value="compare" className="flex items-center gap-1 text-xs sm:text-sm">
              <BarChart2 className="w-3.5 h-3.5" /> Compare
            </TabsTrigger>
          </TabsList>

          {/* ── Optimizer Tab ──────────────────────────────────────────── */}
          <TabsContent value="optimizer">
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
              <ResumeInput resume={resume} onResumeChange={setResume} />
              <JobDescriptionInput jobDescription={jobDescription} onJobDescriptionChange={setJobDescription} />
            </div>

            <div className="text-center mb-12 relative z-10">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || !resume.trim() || !jobDescription.trim()}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground h-14 px-8 text-lg w-full sm:w-auto rounded-xl shadow-glow hover:-translate-y-1 transition-all"
                  size="lg"
                >
                  {isAnalyzing ? (
                    <><RefreshCw className="w-5 h-5 mr-2 animate-spin" /> Analyzing...</>
                  ) : (
                    <><Target className="w-5 h-5 mr-2" /> Analyze Resume</>
                  )}
                </Button>

                {analysis && (
                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    variant="outline"
                    size="lg"
                    className="border-2 border-primary/20 bg-background/50 backdrop-blur-sm h-14 px-8 text-lg w-full sm:w-auto rounded-xl hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all hover:-translate-y-1"
                  >
                    {isGenerating ? (
                      <><RefreshCw className="w-5 h-5 mr-2 animate-spin" /> Optimizing...</>
                    ) : (
                      <><Sparkles className="w-5 h-5 mr-2" /> Generate Optimized Resume</>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Results area */}
            {analysis && (
              <div ref={resultsRef} className="relative z-10 space-y-8">
                <AnalysisResults analysis={analysis} isLoading={isAnalyzing} />

                {isGenerating && (
                  <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-medium w-fit">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    AI is writing your optimized resume — preview updates in real time below
                  </div>
                )}

                {(improvedResume || isGenerating) && (
                  <Tabs value={activeResultTab} onValueChange={setActiveResultTab}>
                    <TabsList className="mb-4">
                      <TabsTrigger value="preview" className="flex items-center gap-2">
                        <FileText className="w-4 h-4" /> Preview & Download
                      </TabsTrigger>
                      {improvedResume && !isGenerating && (
                        <TabsTrigger value="diff" className="flex items-center gap-2">
                          <GitCompare className="w-4 h-4" /> Diff View
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

                {!improvedResume && !isGenerating && (
                  <ResumePreview resume={resume} isStreaming={false} />
                )}
              </div>
            )}

            {/* Feature cards */}
            {!analysis && (
              <div className="mt-24 max-w-6xl mx-auto relative z-10">
                <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 text-foreground tracking-tight">
                  Why Choose Our AI Resume Optimizer?
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {[
                    { icon: Target, title: 'Smart Matching', desc: 'AI analyzes job descriptions to identify key requirements and missing keywords.' },
                    { icon: BrainCircuit, title: 'Semantic Scoring', desc: 'Embedding-based analysis scores each resume section against what the JD actually means — not just keywords.' },
                    { icon: Sparkles, title: 'Instant Results', desc: 'Get actionable insights and a rewritten resume streamed back in real time.' },
                  ].map(({ icon: Icon, title, desc }) => (
                    <div key={title} className="group text-center p-8 bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2">
                      <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-primary group-hover:scale-110 transition-all duration-500">
                        <Icon className="w-8 h-8 text-primary group-hover:text-primary-foreground transition-colors duration-500" />
                      </div>
                      <h3 className="text-xl font-bold mb-3 text-foreground">{title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── Semantic Tab ───────────────────────────────────────────── */}
          <TabsContent value="semantic">
            {(!resume.trim() || !jobDescription.trim()) ? (
              <div className="text-center py-16 text-muted-foreground">
                <BrainCircuit className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">Add your resume and job description first</p>
                <p className="text-sm mt-2">Go to the Optimizer tab to paste or upload your details.</p>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto p-6 rounded-2xl bg-card/40 backdrop-blur-xl border border-border/50 shadow-sm">
                <SemanticAnalysis
                  resume={resume}
                  jobDescription={jobDescription}
                  onUpgradeClick={() => setPricingOpen(true)}
                />
              </div>
            )}
          </TabsContent>

          {/* ── Interview Prep Tab ─────────────────────────────────────── */}
          <TabsContent value="interview">
            {(!resume.trim() || !jobDescription.trim()) ? (
              <div className="text-center py-16 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">Add your resume and job description first</p>
                <p className="text-sm mt-2">Go to the Optimizer tab to paste or upload your details.</p>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto p-6 rounded-2xl bg-card/40 backdrop-blur-xl border border-border/50 shadow-sm">
                <InterviewPrepPanel resume={resume} jobDescription={jobDescription} />
              </div>
            )}
          </TabsContent>

          {/* ── Cover Letter Tab ────────────────────────────────────────── */}
          <TabsContent value="cover-letter">
            {(!resume.trim() || !jobDescription.trim()) && (
              <div className="text-center py-16 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">Add your resume and job description first</p>
                <p className="text-sm mt-2">Go to the Optimizer tab to paste or upload your details.</p>
              </div>
            )}
            {resume.trim() && jobDescription.trim() && (
              <CoverLetterPanel resume={resume} jobDescription={jobDescription} />
            )}
          </TabsContent>

          {/* ── Compare Jobs Tab ────────────────────────────────────────── */}
          <TabsContent value="compare">
            {!resume.trim() && (
              <div className="text-center py-16 text-muted-foreground">
                <BarChart2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">Add your resume first</p>
                <p className="text-sm mt-2">Go to the Optimizer tab to paste or upload your resume.</p>
              </div>
            )}
            {resume.trim() && <JobComparisonPanel resume={resume} />}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
