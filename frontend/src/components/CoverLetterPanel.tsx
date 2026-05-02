import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { generateCoverLetter } from '@/services/resumeApi';
import { FileText, RefreshCw, Copy, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Document, Paragraph, TextRun, Packer } from 'docx';

interface CoverLetterPanelProps {
  resume: string;
  jobDescription: string;
}

export const CoverLetterPanel = ({ resume, jobDescription }: CoverLetterPanelProps) => {
  const [applicantName, setApplicantName] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generate = async () => {
    if (!resume.trim() || !jobDescription.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please provide your resume and job description on the Optimizer tab first.',
        variant: 'destructive',
      });
      return;
    }
    setIsGenerating(true);
    setCoverLetter('');
    try {
      await generateCoverLetter(resume, jobDescription, applicantName, chunk => {
        setCoverLetter(prev => prev + chunk);
      });
      toast({ title: 'Cover Letter Ready', description: 'Preview and download below.' });
    } catch (error: any) {
      toast({
        title: 'Generation Failed',
        description: error.message || 'Could not reach the AI service. Is the backend running?',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(coverLetter);
    toast({ title: 'Copied', description: 'Cover letter copied to clipboard.' });
  };

  const downloadAsPDF = async () => {
    try {
      const element = document.getElementById('cover-letter-content');
      if (!element) return;
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
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
      pdf.save('cover-letter.pdf');
      toast({ title: 'Downloaded', description: 'Cover letter saved as PDF.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to generate PDF.', variant: 'destructive' });
    }
  };

  const downloadAsWord = async () => {
    try {
      const paragraphs = coverLetter.split('\n').map(line =>
        new Paragraph({
          children: [new TextRun({ text: line || ' ', size: 24 })],
          spacing: { after: line.trim() === '' ? 0 : 160 },
        })
      );

      const doc = new Document({ sections: [{ properties: {}, children: paragraphs }] });
      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'cover-letter.docx';
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Downloaded', description: 'Cover letter saved as Word document.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to generate Word document.', variant: 'destructive' });
    }
  };

  const formatParagraphs = (text: string) =>
    text.split('\n').map((line, i) => {
      if (!line.trim()) return <div key={i} className="h-3" />;
      return (
        <p key={i} className="mb-0 text-sm text-black leading-relaxed">
          {line}
        </p>
      );
    });

  return (
    <div className="space-y-6">
      {/* Generator card */}
      <Card className="bg-gradient-card shadow-md border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Cover Letter Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="applicant-name">Your Name (optional)</Label>
            <Input
              id="applicant-name"
              value={applicantName}
              onChange={e => setApplicantName(e.target.value)}
              placeholder="Jane Smith"
            />
          </div>
          <Button
            onClick={generate}
            disabled={isGenerating || !resume.trim() || !jobDescription.trim()}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12"
          >
            {isGenerating ? (
              <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
            ) : (
              <><FileText className="w-4 h-4 mr-2" /> Generate Cover Letter</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Live preview card — shown as soon as generation starts */}
      {(coverLetter || isGenerating) && (
        <Card className="bg-gradient-card shadow-md border-0">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                {isGenerating ? (
                  <span className="flex items-center gap-2">
                    Cover Letter Preview
                    <span className="flex items-center gap-1.5 text-sm font-normal text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Writing...
                    </span>
                  </span>
                ) : 'Cover Letter Preview'}
              </CardTitle>

              {/* Download buttons — only shown once generation is complete */}
              {!isGenerating && coverLetter && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={copyToClipboard}>
                    <Copy className="w-4 h-4 mr-1" /> Copy
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadAsPDF}>
                    <Download className="w-4 h-4 mr-1" /> PDF
                  </Button>
                  <Button size="sm" onClick={downloadAsWord}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    <FileText className="w-4 h-4 mr-1" /> Word
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div
              id="cover-letter-content"
              className="bg-white p-10 rounded-lg shadow-sm min-h-[500px] text-black"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              {coverLetter ? (
                <div className="space-y-0">
                  {formatParagraphs(coverLetter)}
                  {isGenerating && (
                    <span className="inline-block w-0.5 h-4 bg-gray-800 animate-pulse ml-0.5 align-middle" />
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-400 gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <p>Generating your cover letter...</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
