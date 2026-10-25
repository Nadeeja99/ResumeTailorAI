import { useState } from 'react';
import { Edit, FileText, Linkedin, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileDropzone } from '@/components/inputs/FileDropzone';
import { LimitedTextarea } from '@/components/inputs/LimitedTextarea';
import { LinkedInImport } from '@/components/inputs/LinkedInImport';
import { LIMITS } from '@/lib/limits';
import type { ResumeSource } from '@/components/preview/OriginalResume';

interface ResumeInputProps {
  resume: string;
  onResumeChange: (resume: string) => void;
  /** Reports the uploaded PDF (for an exact preview), or null for any other input. */
  onSourceChange: (source: ResumeSource | null) => void;
}

export const ResumeInput = ({ resume, onResumeChange, onSourceChange }: ResumeInputProps) => {
  const [tab, setTab] = useState('paste');

  // Imported text lands on the Paste tab so it can be reviewed and edited
  const importText = (text: string, file?: File) => {
    onResumeChange(text);
    const isPdf = file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
    onSourceChange(isPdf ? { file, text } : null);
    setTab('paste');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" aria-hidden />
          Your resume
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="paste" className="gap-1.5 text-xs sm:text-sm">
              <Edit className="h-4 w-4" /> Paste
            </TabsTrigger>
            <TabsTrigger value="upload" className="gap-1.5 text-xs sm:text-sm">
              <Upload className="h-4 w-4" /> Upload
            </TabsTrigger>
            <TabsTrigger value="linkedin" className="gap-1.5 text-xs sm:text-sm">
              <Linkedin className="h-4 w-4" /> LinkedIn
            </TabsTrigger>
          </TabsList>

          <TabsContent value="paste">
            <LimitedTextarea
              id="resume-text"
              label="Resume"
              value={resume}
              onChange={onResumeChange}
              rule={LIMITS.resume}
              placeholder="Paste your resume here…"
              className="min-h-[240px] sm:min-h-[320px]"
              autoFocus
            />
          </TabsContent>

          <TabsContent value="upload">
            <FileDropzone id="resume-upload" subject="your resume" onText={importText} />
          </TabsContent>

          <TabsContent value="linkedin">
            <LinkedInImport onImported={text => importText(text)} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
