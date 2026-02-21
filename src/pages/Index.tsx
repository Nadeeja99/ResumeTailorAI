import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { ResumeInput } from '@/components/ResumeInput';
import { JobDescriptionInput } from '@/components/JobDescriptionInput';
import { AnalysisResults } from '@/components/AnalysisResults';
import { ResumePreview } from '@/components/ResumePreview';
import { GeminiService } from '@/services/gemini';
import {
  Sparkles,
  Target,
  FileText,
  RefreshCw
} from 'lucide-react';

const Index = () => {
  const [resume, setResume] = useState<string>('');
  const [jobDescription, setJobDescription] = useState<string>('');
  const [analysis, setAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingImprovedResume, setIsGeneratingImprovedResume] = useState(false);
  const [improvedResume, setImprovedResume] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Initialize Gemini service
    const initService = async () => {
      try {
        await GeminiService.initialize();
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize Gemini service:', error);
        toast({
          title: "AI Unavailable",
          description: "Falling back to local analysis. You can still analyze without AI.",
          variant: "destructive",
        });
        // Allow usage with fallback
        setIsInitialized(false);
      }
    };

    initService();
  }, [toast]);

  const tokenize = (text: string): string[] => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
  };

  const unique = (arr: string[]) => Array.from(new Set(arr));

  const heuristicAnalyze = (resumeText: string, jdText: string) => {
    const resumeTokens = unique(tokenize(resumeText));
    const jdTokens = unique(tokenize(jdText));

    // Basic keyword intersection
    const common = jdTokens.filter(t => resumeTokens.includes(t));

    // Heuristic important keywords (longer tokens, common tech words)
    const important = jdTokens.filter(t => t.length > 3);
    const missing = important.filter(t => !resumeTokens.includes(t)).slice(0, 25);

    // Simple scoring based on coverage
    const coverage = important.length > 0 ? Math.round((common.length / important.length) * 100) : 0;
    const boundedCoverage = Math.max(0, Math.min(100, coverage));

    // Generate suggested improvements heuristically
    const suggestedImprovements: string[] = [];
    if (missing.length > 0) {
      suggestedImprovements.push(`Incorporate missing relevant keywords: ${missing.slice(0, 10).join(', ')}`);
    }
    suggestedImprovements.push('Quantify achievements using metrics (%, $, time saved, impact).');
    suggestedImprovements.push('Align section headings and ordering with the job priorities.');
    suggestedImprovements.push('Use consistent tense and action verbs at the start of bullet points.');

    // Strengths: pick overlapping tokens that look like skills
    const skillHints = ['react', 'typescript', 'javascript', 'node', 'python', 'java', 'aws', 'gcp', 'azure', 'sql', 'docker', 'kubernetes', 'linux', 'git', 'tailwind'];
    const strengthsTokens = common.filter(t => skillHints.includes(t));
    const strengths = strengthsTokens.length > 0
      ? strengthsTokens.slice(0, 8).map(s => `Relevant skill highlighted: ${s}`)
      : [
        'Clear alignment on some job requirements.',
        'Found overlap between your experience and the role needs.'
      ];

    // Tone and ATS heuristics
    const toneScore = Math.min(100, Math.max(40, 60 + Math.floor(resumeText.length / 2000) * 5));
    const atsScore = Math.min(100, Math.max(40, 70 - Math.floor((resumeText.match(/\t|\|/g)?.length || 0) * 5)));

    return {
      matchScore: boundedCoverage,
      missingKeywords: missing,
      suggestedImprovements,
      strengths,
      toneAnalysis: {
        score: toneScore,
        feedback: 'Ensure concise bullets, avoid first-person, and maintain consistent formatting.'
      },
      atsOptimization: {
        score: atsScore,
        suggestions: [
          'Use standard section headings (Experience, Education, Skills).',
          'Avoid tables, text boxes, or complex layouts.',
          'Ensure consistent bullet styles and simple fonts.'
        ]
      }
    };
  };

  const analyzeResume = async () => {
    if (!resume.trim() || !jobDescription.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both resume and job description.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      let result: any | null = null;

      // Try AI first if initialized
      if (GeminiService.isInitialized()) {
        try {
          result = await GeminiService.analyzeResume(resume, jobDescription);
        } catch (error: any) {
          console.warn('AI analysis failed, falling back to heuristic:', error);
          // proceed to fallback
        }
      }

      // Fallback heuristic if AI is unavailable or failed
      if (!result) {
        result = heuristicAnalyze(resume, jobDescription);
        toast({
          title: "AI Unavailable — Using Local Analysis",
          description: "We generated a heuristic analysis without calling the AI.",
        });
      }

      setAnalysis(result);
      toast({
        title: "Analysis Complete",
        description: "Your resume has been analyzed successfully!",
      });
    } catch (error: any) {
      console.error('Analysis error:', error);
      let errorMessage = "Failed to analyze resume. Please try again.";
      if (error.message) errorMessage = error.message;
      toast({
        title: "Analysis Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateImprovedResume = async () => {
    if (!analysis || !resume.trim()) {
      toast({
        title: "No Analysis Available",
        description: "Please analyze your resume first.",
        variant: "destructive",
      });
      return;
    }

    if (!GeminiService.isInitialized()) {
      toast({
        title: "AI Not Available",
        description: "Resume optimization requires AI. Please configure your API key.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingImprovedResume(true);
    try {
      const improved = await GeminiService.generateImprovedResume(
        resume,
        jobDescription,
        analysis.suggestedImprovements
      );
      setImprovedResume(improved);
      toast({
        title: "Resume Improved",
        description: "Your optimized resume is ready for review!",
      });
    } catch (error: any) {
      console.error('Improvement error:', error);
      let errorMessage = error?.message || 'Failed to generate improved resume. Please try again.';
      toast({
        title: "Improvement Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsGeneratingImprovedResume(false);
    }
  };

  if (!isInitialized) {
    // We still allow the app to render — local analysis will work.
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden selection:bg-primary/20">
      {/* Ambient Background Effects */}
      <div className="pointer-events-none absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px] animate-float opacity-70" />
      <div className="pointer-events-none absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-accent/20 blur-[120px] animate-float-delayed opacity-70" />

      {/* Hero Section */}
      <div className="relative pt-24 pb-16 lg:pt-32 lg:pb-24 overflow-hidden">
        <div className="relative z-10 container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 backdrop-blur-md rounded-full px-5 py-2 mb-8 shadow-sm transition-all hover:bg-primary/20">
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
              Use advanced AI to analyze job descriptions and optimize your resume for maximum impact.
              Beat ATS systems and impress recruiters with data-driven improvements.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 pb-20">
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <ResumeInput resume={resume} onResumeChange={setResume} />
          <JobDescriptionInput
            jobDescription={jobDescription}
            onJobDescriptionChange={setJobDescription}
          />
        </div>

        {/* Action Buttons */}
        <div className="text-center mb-16 relative z-10">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              onClick={analyzeResume}
              disabled={isAnalyzing || !resume.trim() || !jobDescription.trim()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 shadow-glow hover:shadow-lg hover:-translate-y-1 h-14 px-8 text-lg w-full sm:w-auto rounded-xl"
              size="lg"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Target className="w-5 h-5 mr-2" />
                  Analyze Resume
                </>
              )}
            </Button>

            {analysis && (
              <Button
                onClick={generateImprovedResume}
                disabled={isGeneratingImprovedResume || !GeminiService.isInitialized()}
                variant="outline"
                size="lg"
                className="border-2 border-primary/20 bg-background/50 backdrop-blur-sm text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-1 h-14 px-8 text-lg w-full sm:w-auto rounded-xl"
              >
                {isGeneratingImprovedResume ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                    Optimizing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Generate Optimized Resume
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="relative z-10 grid grid-cols-1 xl:grid-cols-3 gap-8">
          {analysis && (
            <div className="xl:col-span-2">
              <AnalysisResults analysis={analysis} isLoading={isAnalyzing} />
            </div>
          )}

          <div className={analysis ? '' : 'xl:col-span-3'}>
            <ResumePreview
              resume={improvedResume || resume}
              suggestions={improvedResume ? analysis?.suggestedImprovements : []}
            />
          </div>
        </div>

        {/* Features Section */}
        {!analysis && (
          <div className="mt-24 max-w-6xl mx-auto relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 text-foreground tracking-tight">
              Why Choose Our AI Resume Optimizer?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="group text-center p-8 bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-primary group-hover:scale-110 transition-all duration-500 shadow-sm group-hover:shadow-glow">
                  <Target className="w-8 h-8 text-primary group-hover:text-primary-foreground transition-colors duration-500" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-foreground">Smart Matching</h3>
                <p className="text-muted-foreground leading-relaxed">
                  AI analyzes job descriptions to identify key requirements and missing keywords in your resume.
                </p>
              </div>

              <div className="group text-center p-8 bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-primary group-hover:scale-110 transition-all duration-500 shadow-sm group-hover:shadow-glow">
                  <FileText className="w-8 h-8 text-primary group-hover:text-primary-foreground transition-colors duration-500" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-foreground">ATS Optimization</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Ensure your resume passes Applicant Tracking Systems with format and keyword optimization.
                </p>
              </div>

              <div className="group text-center p-8 bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-primary group-hover:scale-110 transition-all duration-500 shadow-sm group-hover:shadow-glow">
                  <Sparkles className="w-8 h-8 text-primary group-hover:text-primary-foreground transition-colors duration-500" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-foreground">Instant Results</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Get actionable insights and an optimized resume in seconds, not hours.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;