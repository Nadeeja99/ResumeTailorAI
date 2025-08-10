import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Upload, FileText, Edit } from 'lucide-react';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface ResumeInputProps {
  resume: string;
  onResumeChange: (resume: string) => void;
}

export const ResumeInput = ({ resume, onResumeChange }: ResumeInputProps) => {
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n';
      }

      return fullText.trim();
    } catch (error) {
      console.error('Error extracting PDF text:', error);
      throw new Error('Failed to extract text from PDF file');
    }
  };

  const extractTextFromWord = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value.trim();
    } catch (error) {
      console.error('Error extracting Word text:', error);
      throw new Error('Failed to extract text from Word document');
    }
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    
    try {
      let text = '';
      
      if (file.type === "text/plain") {
        const reader = new FileReader();
        text = await new Promise((resolve, reject) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsText(file);
        });
      } else if (file.type === "application/pdf") {
        text = await extractTextFromPDF(file);
      } else if (
        file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        file.type === "application/msword"
      ) {
        text = await extractTextFromWord(file);
      } else {
        throw new Error('Unsupported file type. Please upload a .txt, .pdf, or .docx file.');
      }

      onResumeChange(text);
      toast({
        title: "File Uploaded Successfully",
        description: `Extracted text from ${file.name}`,
      });
    } catch (error: any) {
      console.error('File processing error:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to process the uploaded file",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="paste" className="flex items-center gap-2">
              <Edit className="w-4 h-4" />
              Paste Text
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Upload File
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="paste" className="space-y-4">
            <Textarea
              value={resume}
              onChange={(e) => onResumeChange(e.target.value)}
              placeholder="Paste your resume content here..."
              className="min-h-[300px] resize-none"
            />
          </TabsContent>
          
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
                {isProcessing 
                  ? 'Processing your file...' 
                  : 'Drag and drop your resume file here, or click to select'
                }
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
                  {isProcessing ? 'Processing...' : 'Select File'}
                </label>
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Supports: .txt, .pdf, .docx, .doc files
              </p>
            </div>
            
            {resume && (
              <div className="mt-4">
                <Textarea
                  value={resume}
                  onChange={(e) => onResumeChange(e.target.value)}
                  className="min-h-[200px] resize-none"
                  disabled={isProcessing}
                />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};