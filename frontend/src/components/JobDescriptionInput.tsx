import { useState } from 'react';
import { Briefcase, Edit, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileDropzone } from '@/components/inputs/FileDropzone';
import { LimitedTextarea } from '@/components/inputs/LimitedTextarea';
import { LIMITS } from '@/lib/limits';

interface JobDescriptionInputProps {
  jobDescription: string;
  onJobDescriptionChange: (jd: string) => void;
}

export const JobDescriptionInput = ({ jobDescription, onJobDescriptionChange }: JobDescriptionInputProps) => {
  const [tab, setTab] = useState('paste');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-muted-foreground" aria-hidden />
          Job description
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="paste" className="gap-2">
              <Edit className="h-4 w-4" /> Paste
            </TabsTrigger>
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="h-4 w-4" /> Upload
            </TabsTrigger>
          </TabsList>

          <TabsContent value="paste">
            <LimitedTextarea
              id="job-description-text"
              label="Job description"
              value={jobDescription}
              onChange={onJobDescriptionChange}
              rule={LIMITS.jobDescription}
              placeholder="Paste the job description you're applying for…"
              className="min-h-[240px] sm:min-h-[320px]"
            />
          </TabsContent>

          <TabsContent value="upload">
            <FileDropzone
              id="jd-upload"
              subject="the job description"
              onText={text => {
                onJobDescriptionChange(text);
                setTab('paste');
              }}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
