import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Upload, FileText, Edit, Linkedin, Loader2, CheckCircle } from 'lucide-react';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { parseLinkedIn } from '@/services/resumeApi';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface ResumeInputProps {
  resume: string;
  onResumeChange: (resume: string) => void;
}

async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    fullText += content.items.map((item: any) => item.str).join(' ') + '\n';
  }
  return fullText.trim();
}

async function extractWordText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value.trim();
}

export const ResumeInput = ({ resume, onResumeChange }: ResumeInputProps) => {
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [linkedInStep, setLinkedInStep] = useState<'idle' | 'extracting' | 'parsing' | 'done'>('idle');
  const { toast } = useToast();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    try {
      let text = '';
      if (file.type === 'text/plain') {
        text = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = e => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsText(file);
        });
      } else if (file.type === 'application/pdf') {
        text = await extractPdfText(file);
      } else if (
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.type === 'application/msword'
      ) {
        text = await extractWordText(file);
      } else {
        throw new Error('Unsupported file type. Please upload .txt, .pdf, or .docx.');
      }
      onResumeChange(text);
      toast({ title: 'File Uploaded', description: `Extracted text from ${file.name}` });
    } catch (error: any) {
      toast({ title: 'Upload Failed', description: error.message || 'Could not process file.', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleLinkedInUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so same file can be re-uploaded
    e.target.value = '';

    if (file.type !== 'application/pdf') {
      toast({ title: 'PDF Required', description: 'Please upload the PDF exported from LinkedIn.', variant: 'destructive' });
      return;
    }

    try {
      setLinkedInStep('extracting');
      const rawText = await extractPdfText(file);

      setLinkedInStep('parsing');
      const cleanedResume = await parseLinkedIn(rawText);

      onResumeChange(cleanedResume);
      setLinkedInStep('done');
      toast({ title: 'LinkedIn Profile Imported', description: 'Your profile has been structured as a resume.' });
    } catch (error: any) {
      setLinkedInStep('idle');
      toast({
        title: 'Import Failed',
        description: error.message || 'Could not parse LinkedIn PDF.',
        variant: 'destructive',
      });
    }
  };

  const linkedInStatusLabel = {
    idle: null,
    extracting: 'Extracting text from PDF…',
    parsing: 'AI is structuring your LinkedIn profile…',
    done: 'Profile imported successfully!',
  }[linkedInStep];

  return (
    <Card className="bg-gradient-card shadow-md border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Your Resume
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="paste" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="paste" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Edit className="w-4 h-4" /> Paste
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Upload className="w-4 h-4" /> Upload
            </TabsTrigger>
            <TabsTrigger value="linkedin" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Linkedin className="w-4 h-4" /> LinkedIn
            </TabsTrigger>
          </TabsList>

          {/* ── Paste tab ── */}
          <TabsContent value="paste">
            <Textarea
              value={resume}
              onChange={e => onResumeChange(e.target.value)}
              placeholder="Paste your resume content here…"
              className="min-h-[300px] resize-none"
            />
          </TabsContent>

          {/* ── Upload tab ── */}
          <TabsContent value="upload" className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                dragActive
                  ? 'border-primary bg-primary/5'
                  : isProcessing
                  ? 'border-muted-foreground bg-muted/20'
                  : 'border-border hover:border-primary/50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className={`w-12 h-12 mx-auto mb-4 ${isProcessing ? 'animate-pulse text-primary' : 'text-muted-foreground'}`} />
              <p className="text-sm text-muted-foreground mb-4">
                {isProcessing ? 'Processing your file…' : 'Drag and drop your resume, or click to select'}
              </p>
              <input
                type="file"
                accept=".txt,.pdf,.docx,.doc"
                onChange={handleFileUpload}
                className="hidden"
                id="resume-upload"
                disabled={isProcessing}
              />
              <Button asChild variant="outline" disabled={isProcessing}>
                <label htmlFor="resume-upload" className="cursor-pointer">
                  {isProcessing ? 'Processing…' : 'Select File'}
                </label>
              </Button>
              <p className="text-xs text-muted-foreground mt-2">Supports: .txt, .pdf, .docx</p>
            </div>
            {resume && (
              <Textarea
                value={resume}
                onChange={e => onResumeChange(e.target.value)}
                className="min-h-[200px] resize-none"
                disabled={isProcessing}
              />
            )}
          </TabsContent>

          {/* ── LinkedIn tab ── */}
          <TabsContent value="linkedin" className="space-y-4">
            <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4 text-sm text-blue-700 dark:text-blue-300 space-y-2">
              <p className="font-semibold flex items-center gap-2">
                <Linkedin className="w-4 h-4" /> How to export your LinkedIn PDF:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Go to your LinkedIn profile page</li>
                <li>Click <strong>More</strong> → <strong>Save to PDF</strong></li>
                <li>Upload the downloaded PDF below</li>
              </ol>
              <p className="text-xs text-blue-500 dark:text-blue-400">
                AI will clean up LinkedIn's multi-column layout and structure it as a proper resume.
              </p>
            </div>

            <div className="border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-xl p-8 text-center hover:border-blue-500 transition-colors">
              {linkedInStep === 'idle' && (
                <>
                  <Linkedin className="w-12 h-12 mx-auto mb-3 text-blue-500" />
                  <p className="text-sm text-muted-foreground mb-4">Upload your LinkedIn profile PDF</p>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleLinkedInUpload}
                    className="hidden"
                    id="linkedin-upload"
                  />
                  <Button asChild variant="outline" className="border-blue-400 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30">
                    <label htmlFor="linkedin-upload" className="cursor-pointer">
                      Choose LinkedIn PDF
                    </label>
                  </Button>
                </>
              )}

              {(linkedInStep === 'extracting' || linkedInStep === 'parsing') && (
                <div className="space-y-3 py-4">
                  <Loader2 className="w-10 h-10 mx-auto text-blue-500 animate-spin" />
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-300">{linkedInStatusLabel}</p>
                  <div className="w-48 mx-auto h-1.5 rounded-full bg-blue-100 dark:bg-blue-800 overflow-hidden">
                    <div className={`h-full bg-blue-500 rounded-full transition-all duration-700 ${linkedInStep === 'extracting' ? 'w-1/3' : 'w-2/3'}`} />
                  </div>
                </div>
              )}

              {linkedInStep === 'done' && (
                <div className="space-y-3 py-4">
                  <CheckCircle className="w-10 h-10 mx-auto text-green-500" />
                  <p className="text-sm font-medium text-green-600 dark:text-green-300">{linkedInStatusLabel}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLinkedInStep('idle')}
                    className="text-xs text-muted-foreground"
                  >
                    Import another
                  </Button>
                </div>
              )}
            </div>

            {resume && linkedInStep === 'done' && (
              <Textarea
                value={resume}
                onChange={e => onResumeChange(e.target.value)}
                className="min-h-[200px] resize-none"
              />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
