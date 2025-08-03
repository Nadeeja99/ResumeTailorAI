import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Target, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  Lightbulb 
} from 'lucide-react';

interface AnalysisData {
  matchScore: number;
  missingKeywords: string[];
  suggestedImprovements: string[];
  strengths: string[];
  toneAnalysis: {
    score: number;
    feedback: string;
  };
  atsOptimization: {
    score: number;
    suggestions: string[];
  };
}

interface AnalysisResultsProps {
  analysis: AnalysisData;
  isLoading: boolean;
}

export const AnalysisResults = ({ analysis, isLoading }: AnalysisResultsProps) => {
  if (isLoading) {
    return (
      <Card className="bg-gradient-card shadow-md border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary animate-spin" />
            Analyzing Resume...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 bg-muted rounded animate-pulse" />
            <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
            <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-destructive';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-success';
    if (score >= 60) return 'bg-warning';
    return 'bg-destructive';
  };

  return (
    <div className="space-y-6">
      {/* Match Score Overview */}
      <Card className="bg-gradient-card shadow-md border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Resume Match Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <span className="text-2xl font-bold text-foreground">
              {analysis.matchScore}%
            </span>
            <span className={`text-sm font-medium ${getScoreColor(analysis.matchScore)}`}>
              {analysis.matchScore >= 80 ? 'Excellent' : 
               analysis.matchScore >= 60 ? 'Good' : 'Needs Improvement'}
            </span>
          </div>
          <Progress 
            value={analysis.matchScore} 
            className="h-3"
          />
        </CardContent>
      </Card>

      {/* Missing Keywords */}
      <Card className="bg-gradient-card shadow-md border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-warning" />
            Missing Keywords
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analysis.missingKeywords.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {analysis.missingKeywords.map((keyword, index) => (
                <Badge key={index} variant="outline" className="text-warning border-warning">
                  {keyword}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-success text-sm">
              ✓ All important keywords are present in your resume
            </p>
          )}
        </CardContent>
      </Card>

      {/* Strengths */}
      <Card className="bg-gradient-card shadow-md border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-success" />
            Strengths
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {analysis.strengths.map((strength, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                {strength}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Suggested Improvements */}
      <Card className="bg-gradient-card shadow-md border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-accent" />
            Suggested Improvements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {analysis.suggestedImprovements.map((improvement, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <TrendingUp className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                {improvement}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Tone & ATS Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gradient-card shadow-md border-0">
          <CardHeader>
            <CardTitle className="text-lg">Tone Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Score</span>
                <span className={`text-sm font-bold ${getScoreColor(analysis.toneAnalysis.score)}`}>
                  {analysis.toneAnalysis.score}%
                </span>
              </div>
              <Progress value={analysis.toneAnalysis.score} className="h-2" />
              <p className="text-sm text-muted-foreground">
                {analysis.toneAnalysis.feedback}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-md border-0">
          <CardHeader>
            <CardTitle className="text-lg">ATS Optimization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Score</span>
                <span className={`text-sm font-bold ${getScoreColor(analysis.atsOptimization.score)}`}>
                  {analysis.atsOptimization.score}%
                </span>
              </div>
              <Progress value={analysis.atsOptimization.score} className="h-2" />
              <ul className="space-y-1">
                {analysis.atsOptimization.suggestions.map((suggestion, index) => (
                  <li key={index} className="text-xs text-muted-foreground">
                    • {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};