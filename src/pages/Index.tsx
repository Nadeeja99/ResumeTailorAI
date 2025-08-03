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
          title: "Initialization Failed",
          description: "Failed to initialize AI service. Please check your environment configuration.",
          variant: "destructive",
        });
      }
    };
    
    initService();
  }, [toast]);

  const analyzeResume = async () => {
    if (!resume.trim() || !jobDescription.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both resume and job description.",
        variant: "destructive",
      });
      return;
    }

    if (!isInitialized) {
      toast({
        title: "Service Not Ready",
        description: "AI service is still initializing. Please wait a moment and try again.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await GeminiService.analyzeResume(resume, jobDescription);
      setAnalysis(result);
      toast({
        title: "Analysis Complete",
        description: "Your resume has been analyzed successfully!",
      });
    } catch (error: any) {
      console.error('Analysis error:', error);
      
      let errorMessage = "Failed to analyze resume. Please try again.";
      
      if (error.message?.includes('Invalid JSON response')) {
        errorMessage = "AI response format error. Please try again.";
      } else if (error.message?.includes('API_KEY_INVALID')) {
        errorMessage = "Invalid API key. Please check your environment configuration.";
      } else if (error.message?.includes('QUOTA_EXCEEDED')) {
        errorMessage = "API quota exceeded. Please check your usage limits.";
      } else if (error.message?.includes('PERMISSION_DENIED')) {
        errorMessage = "API access denied. Please check your API key permissions.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
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

    if (!isInitialized) {
      toast({
        title: "Service Not Ready",
        description: "AI service is still initializing. Please wait a moment and try again.",
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
      
      let errorMessage = "Failed to generate improved resume. Please try again.";
      
      if (error.message?.includes('API_KEY_INVALID')) {
        errorMessage = "Invalid API key. Please check your environment configuration.";
      } else if (error.message?.includes('QUOTA_EXCEEDED')) {
        errorMessage = "API quota exceeded. Please check your usage limits.";
      } else if (error.message?.includes('PERMISSION_DENIED')) {
        errorMessage = "API access denied. Please check your API key permissions.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
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
    return (
      <div className="min-h-screen bg-gradient-muted flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <RefreshCw className="w-8 h-8 text-white animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Initializing AI Service</h2>
          <p className="text-muted-foreground">Please wait while we set up the AI service...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-muted">
      {/* Hero Section */}
      <div className="bg-gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10 container mx-auto px-4 py-16 text-center">
          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <Sparkles className="w-5 h-5 text-white" />
              <span className="text-white text-sm font-medium">AI-Powered Resume Optimization</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Tailor Your Resume to
              <span className="block bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
                Land Your Dream Job
              </span>
            </h1>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              Use advanced AI to analyze job descriptions and optimize your resume for maximum impact. 
              Beat ATS systems and impress recruiters with data-driven improvements.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <ResumeInput resume={resume} onResumeChange={setResume} />
          <JobDescriptionInput 
            jobDescription={jobDescription} 
            onJobDescriptionChange={setJobDescription} 
          />
        </div>

        {/* Action Buttons */}
        <div className="text-center mb-12">
          <div className="space-x-4">
            <Button 
              onClick={analyzeResume}
              disabled={isAnalyzing || !resume.trim() || !jobDescription.trim() || !isInitialized}
              className="bg-gradient-primary hover:opacity-90 transition-smooth shadow-glow"
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
                disabled={isGeneratingImprovedResume || !isInitialized}
                variant="outline"
                size="lg"
                className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
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
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
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
          <div className="mt-16 max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12 text-foreground">
              Why Choose Our AI Resume Optimizer?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center p-6 bg-gradient-card rounded-xl shadow-md">
                <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-foreground">Smart Matching</h3>
                <p className="text-muted-foreground">
                  AI analyzes job descriptions to identify key requirements and missing keywords in your resume.
                </p>
              </div>
              
              <div className="text-center p-6 bg-gradient-card rounded-xl shadow-md">
                <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-foreground">ATS Optimization</h3>
                <p className="text-muted-foreground">
                  Ensure your resume passes Applicant Tracking Systems with format and keyword optimization.
                </p>
              </div>
              
              <div className="text-center p-6 bg-gradient-card rounded-xl shadow-md">
                <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-foreground">Instant Results</h3>
                <p className="text-muted-foreground">
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