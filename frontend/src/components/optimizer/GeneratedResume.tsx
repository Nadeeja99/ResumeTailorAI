import { useState } from 'react';
import { FileText, GitCompare } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RequestError } from '@/components/common/RequestError';
import { ResumeDiff } from '@/components/ResumeDiff';
import { ResumePreview } from '@/components/ResumePreview';
import type { AIStatus } from '@/hooks/useAI';

interface GeneratedResumeProps {
  original: string;
  text: string;
  status: AIStatus;
  error: Error | null;
  suggestions: string[];
  onRetry: () => void;
}

/** Streamed tailored resume with preview / changes tabs. Falls back to the original when nothing was generated. */
export function GeneratedResume({ original, text, status, error, suggestions, onRetry }: GeneratedResumeProps) {
  const [tab, setTab] = useState('preview');
  const streaming = status === 'loading' || status === 'streaming';
  const finished = Boolean(text) && !streaming;

  if (!text && !streaming) {
    return (
      <div className="space-y-4">
        {status === 'error' && error && <RequestError error={error} onRetry={onRetry} />}
        <ResumePreview resume={original} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {status === 'error' && error && <RequestError error={error} onRetry={onRetry} />}
      {status === 'aborted' && (
        <p className="text-sm text-muted-foreground">Generation stopped — showing the partial result.</p>
      )}
      <Tabs value={finished ? tab : 'preview'} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="preview" className="gap-2">
            <FileText className="h-4 w-4" /> Preview & download
          </TabsTrigger>
          {finished && (
            <TabsTrigger value="diff" className="gap-2">
              <GitCompare className="h-4 w-4" /> Changes
            </TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="preview">
          <ResumePreview resume={text} isStreaming={streaming} suggestions={status === 'success' ? suggestions : []} />
        </TabsContent>
        {finished && (
          <TabsContent value="diff">
            <ResumeDiff original={original} improved={text} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
