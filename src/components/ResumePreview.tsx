import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Eye } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ResumePreviewProps {
  resume: string;
  suggestions?: string[];
}

export const ResumePreview = ({ resume, suggestions = [] }: ResumePreviewProps) => {
  const { toast } = useToast();

  const downloadAsPDF = async () => {
    try {
      const element = document.getElementById('resume-preview-content');
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save('tailored-resume.pdf');
      
      toast({
        title: "Success",
        description: "Resume downloaded as PDF successfully!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatResumeText = (text: string) => {
    return text.split('\n').map((line, index) => {
      // Detect headings (lines in ALL CAPS or with specific patterns)
      if (line.trim().length > 0 && (
        line === line.toUpperCase() || 
        line.includes('EXPERIENCE') || 
        line.includes('EDUCATION') || 
        line.includes('SKILLS') ||
        line.includes('CONTACT')
      )) {
        return (
          <h3 key={index} className="font-bold text-lg text-primary mt-6 mb-2 first:mt-0">
            {line.trim()}
          </h3>
        );
      }
      
      // Detect bullet points
      if (line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*')) {
        return (
          <p key={index} className="ml-4 mb-1 text-sm text-foreground">
            {line.trim()}
          </p>
        );
      }
      
      // Regular paragraphs
      if (line.trim().length > 0) {
        return (
          <p key={index} className="mb-2 text-sm text-foreground leading-relaxed">
            {line.trim()}
          </p>
        );
      }
      
      // Empty lines
      return <div key={index} className="h-2" />;
    });
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-card shadow-md border-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              Resume Preview
            </CardTitle>
            <Button 
              onClick={downloadAsPDF}
              className="bg-gradient-primary hover:opacity-90 transition-smooth"
              disabled={!resume.trim()}
            >
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div 
            id="resume-preview-content"
            className="bg-white p-8 rounded-lg shadow-sm min-h-[600px] text-black"
            style={{ fontFamily: 'Arial, sans-serif' }}
          >
            {resume ? (
              <div className="space-y-1">
                {formatResumeText(resume)}
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-400">
                <p>Resume content will appear here...</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {suggestions.length > 0 && (
        <Card className="bg-gradient-card shadow-md border-0">
          <CardHeader>
            <CardTitle className="text-lg">Applied Improvements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <Badge key={index} variant="secondary" className="mr-2 mb-2">
                  {suggestion}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};