import { useState } from 'react';
import { getErrorMessage } from '@/lib/utils';
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
    } catch (error) {
      toast({
        title: 'Generation Failed',
        description: getErrorMessage(error, 'Could not reach the AI service. Is the backend running?'),
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
        <p key={i} className="mb-0 text-sm leading-relaxed text-zinc-800">
          {line}
        </p>
      );
    });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" aria-hidden />
            Cover letter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="applicant-name">Your name (optional)</Label>
              <Input
                id="applicant-name"
                value={applicantName}
                onChange={e => setApplicantName(e.target.value)}
                placeholder="Jane Smith"
              />
            </div>
            <Button onClick={generate} disabled={isGenerating || !resume.trim() || !jobDescription.trim()}>
              {isGenerating ? <RefreshCw className="animate-spin" /> : <FileText />}
              {isGenerating ? 'Writing…' : 'Generate cover letter'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Live preview — shown as soon as generation starts */}
      {(coverLetter || isGenerating) && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                Preview
                {isGenerating && (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    <RefreshCw className="h-3 w-3 animate-spin" aria-hidden /> Writing…
                  </span>
                )}
              </CardTitle>

              {/* Export actions — only once generation is complete */}
              {!isGenerating && coverLetter && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={copyToClipboard}>
                    <Copy /> Copy
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadAsPDF}>
                    <Download /> PDF
                  </Button>
                  <Button size="sm" onClick={downloadAsWord}>
                    <FileText /> Word
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {/* Paper keeps print colors in both themes so it matches the exported PDF */}
            <div
              id="cover-letter-content"
              className="min-h-[500px] rounded-md bg-white p-8 text-zinc-900 shadow-sm ring-1 ring-black/5 sm:p-12"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              {coverLetter ? (
                <div className="space-y-0">
                  {formatParagraphs(coverLetter)}
                  {isGenerating && (
                    <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-zinc-900 align-middle" />
                  )}
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center gap-2 text-zinc-400">
                  <RefreshCw className="h-4 w-4 animate-spin" aria-hidden />
                  <p>Writing your cover letter…</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
