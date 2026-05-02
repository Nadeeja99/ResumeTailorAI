import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Briefcase } from 'lucide-react';

interface JobDescriptionInputProps {
  jobDescription: string;
  onJobDescriptionChange: (jobDescription: string) => void;
}

export const JobDescriptionInput = ({ 
  jobDescription, 
  onJobDescriptionChange 
}: JobDescriptionInputProps) => {
  return (
    <Card className="bg-gradient-card shadow-md border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-accent" />
          Job Description
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea
          value={jobDescription}
          onChange={(e) => onJobDescriptionChange(e.target.value)}
          placeholder="Paste the job description you're applying for..."
          className="min-h-[300px] resize-none"
        />
      </CardContent>
    </Card>
  );
};