import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Briefcase, Upload, Edit } from 'lucide-react';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface JobDescriptionInputProps {
  jobDescription: string;
  onJobDescriptionChange: (jd: string) => void;
}

export const JobDescriptionInput = ({ jobDescription, onJobDescriptionChange }: JobDescriptionInputProps) => {
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const extractText = async (file: File): Promise<string> => {
    if (file.type === 'text/plain') {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsText(file);
      });
    }
    if (file.type === 'application/pdf') {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((item: any) => item.str).join(' ') + '\n';
      }
      return text.trim();
    }
    if (
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.type === 'application/msword'
    ) {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value.trim();
    }
    throw new Error('Unsupported file type. Please upload a .txt, .pdf, or .docx file.');
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    try {
      const text = await extractText(file);
      onJobDescriptionChange(text);
      toast({ title: 'File Uploaded', description: `Extracted text from ${file.name}` });
    } catch (error: any) {
      toast({ title: 'Upload Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]);
  };

  return (
    <Card className="bg-gradient-card shadow-md border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-accent" />
          Job Description
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="paste" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="paste" className="flex items-center gap-2">
              <Edit className="w-4 h-4" /> Paste Text
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="w-4 h-4" /> Upload File
            </TabsTrigger>
          </TabsList>

          <TabsContent value="paste">
            <Textarea
              value={jobDescription}
              onChange={e => onJobDescriptionChange(e.target.value)}
              placeholder="Paste the job description you're applying for..."
              className="min-h-[300px] resize-none"
            />
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                dragActive ? 'border-accent bg-accent/5' : isProcessing ? 'border-muted-foreground bg-muted/20' : 'border-border hover:border-accent/50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className={`w-12 h-12 mx-auto mb-4 ${isProcessing ? 'animate-pulse text-accent' : 'text-muted-foreground'}`} />
              <p className="text-sm text-muted-foreground mb-4">
                {isProcessing ? 'Processing file...' : 'Drag and drop the job description file, or click to select'}
              </p>
              <input
                type="file"
                accept=".txt,.pdf,.docx,.doc"
                onChange={e => e.target.files?.[0] && processFile(e.target.files[0])}
                className="hidden"
                id="jd-upload"
                disabled={isProcessing}
              />
              <Button asChild variant="outline" disabled={isProcessing}>
                <label htmlFor="jd-upload" className="cursor-pointer">
                  {isProcessing ? 'Processing...' : 'Select File'}
                </label>
              </Button>
              <p className="text-xs text-muted-foreground mt-2">Supports: .txt, .pdf, .docx</p>
            </div>
            {jobDescription && (
              <Textarea
                value={jobDescription}
                onChange={e => onJobDescriptionChange(e.target.value)}
                className="min-h-[200px] resize-none"
                disabled={isProcessing}
              />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
