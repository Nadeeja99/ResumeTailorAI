import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Eye, FileText, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Document, Paragraph, TextRun, HeadingLevel, Packer } from 'docx';

interface ResumePreviewProps {
  resume: string;
  isStreaming?: boolean;
  suggestions?: string[];
}

export const ResumePreview = ({ resume, isStreaming = false, suggestions = [] }: ResumePreviewProps) => {
  const { toast } = useToast();

  const downloadAsPDF = async () => {
    try {
      const element = document.getElementById('resume-preview-content');
      if (!element) return;
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, allowTaint: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft >= 0) {
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, heightLeft - imgHeight, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      pdf.save('tailored-resume.pdf');
      toast({ title: 'Downloaded', description: 'Resume saved as PDF.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to generate PDF.', variant: 'destructive' });
    }
  };

  const downloadAsWord = async () => {
    try {
      const lines = resume.split('\n');
      const children: Paragraph[] = lines.map(line => {
        const trimmed = line.trim();
        const isHeading =
          trimmed.length > 0 &&
          (trimmed === trimmed.toUpperCase() ||
            /^(EXPERIENCE|EDUCATION|SKILLS|CONTACT|SUMMARY|OBJECTIVE|PROJECTS|CERTIFICATIONS)/i.test(trimmed));

        if (isHeading && trimmed.length > 0) {
          return new Paragraph({
            text: trimmed,
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 240, after: 120 },
          });
        }

        const isBullet = /^[•\-\*]/.test(trimmed);
        return new Paragraph({
          children: [new TextRun({ text: trimmed || ' ', size: 22 })],
          bullet: isBullet ? { level: 0 } : undefined,
          spacing: { after: 80 },
        });
      });

      const doc = new Document({
        sections: [{ properties: {}, children }],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tailored-resume.docx';
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Downloaded', description: 'Resume saved as Word document.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to generate Word document.', variant: 'destructive' });
    }
  };

  const formatResumeText = (text: string) => {
    return text.split('\n').map((line, index) => {
      if (
        line.trim().length > 0 &&
        (line === line.toUpperCase() ||
          /^(EXPERIENCE|EDUCATION|SKILLS|CONTACT|SUMMARY|OBJECTIVE|PROJECTS|CERTIFICATIONS)/i.test(line.trim()))
      ) {
        return (
          <h3 key={index} className="font-bold text-lg text-primary mt-6 mb-2 first:mt-0">
            {line.trim()}
          </h3>
        );
      }
      if (/^[•\-\*]/.test(line.trim())) {
        return (
          <p key={index} className="ml-4 mb-1 text-sm text-foreground">
            {line.trim()}
          </p>
        );
      }
      if (line.trim().length > 0) {
        return (
          <p key={index} className="mb-2 text-sm text-foreground leading-relaxed">
            {line.trim()}
          </p>
        );
      }
      return <div key={index} className="h-2" />;
    });
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-card shadow-md border-0">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              {isStreaming ? (
                <span className="flex items-center gap-2">
                  Resume Preview
                  <span className="flex items-center gap-1.5 text-sm font-normal text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Writing...
                  </span>
                </span>
              ) : 'Resume Preview'}
            </CardTitle>
            {!isStreaming && (
              <div className="flex gap-2">
                <Button onClick={downloadAsPDF} variant="outline" size="sm" disabled={!resume.trim()}>
                  <Download className="w-4 h-4 mr-2" /> PDF
                </Button>
                <Button onClick={downloadAsWord} size="sm" disabled={!resume.trim()}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  <FileText className="w-4 h-4 mr-2" /> Word
                </Button>
              </div>
            )}
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
                {isStreaming && (
                  <span className="inline-block w-0.5 h-4 bg-primary animate-pulse ml-0.5 align-middle" />
                )}
              </div>
            ) : isStreaming ? (
              <div className="flex items-center justify-center h-64 text-gray-400 gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <p>Generating optimized resume...</p>
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
              {suggestions.map((s, i) => (
                <Badge key={i} variant="secondary" className="mr-2 mb-2">{s}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
