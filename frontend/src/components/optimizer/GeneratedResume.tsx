import { lazy, Suspense, useMemo, useState } from 'react';
import { FileText, GitCompare } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RequestError } from '@/components/common/RequestError';
import { StreamControls } from '@/components/ai/StreamControls';
import { TelemetryDrawer } from '@/components/ai/telemetry/TelemetryDrawer';
import { Skeleton } from '@/components/ui/skeleton';
import { ResumePreview } from '@/components/ResumePreview';
import type { useAIStream } from '@/hooks/useAI';
import { markdownToPlainText } from '@/lib/markdownBlocks';

// The word-diff view (and the `diff` library) only load when the Changes tab is opened
const ResumeDiff = lazy(() => import('@/components/ResumeDiff').then(m => ({ default: m.ResumeDiff })));

interface GeneratedResumeProps {
  original: string;
  stream: ReturnType<typeof useAIStream>;
  suggestions: string[];
  onRetry: () => void;
}

/** Streamed tailored resume (Markdown) with preview / changes tabs. Shows the original until something is generated. */
export function GeneratedResume({ original, stream, suggestions, onRetry }: GeneratedResumeProps) {
  const [tab, setTab] = useState('preview');
  const { text, status, error } = stream;
  const finished = Boolean(text) && !stream.isPending;
  // Diff readable text, not Markdown syntax, against the user's plain-text original
  const plainRewrite = useMemo(() => (finished ? markdownToPlainText(text) : ''), [finished, text]);

  // Telemetry goes under the error only when there is no preview (the preview footer shows it otherwise)
  const errorBanner = (withTelemetry: boolean) =>
    status === 'error' && error && (
      <RequestError error={error} onRetry={onRetry} telemetry={withTelemetry ? stream.telemetry : null} />
    );

  if (!text && !stream.isPending) {
    return (
      <div className="space-y-4">
        {errorBanner(true)}
        <ResumePreview resume={original} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {errorBanner(false)}
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
          <ResumePreview
            resume={text}
            format="markdown"
            isStreaming={stream.isPending}
            suggestions={status === 'success' ? suggestions : []}
            status={
              <StreamControls
                status={status}
                startedAt={stream.startedAt}
                firstChunkAt={stream.firstChunkAt}
                chars={text.length}
                timing={stream.timing}
                onStop={stream.abort}
              />
            }
            footer={<TelemetryDrawer telemetry={stream.telemetry} timing={stream.timing} />}
          />
        </TabsContent>
        {finished && (
          <TabsContent value="diff">
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              <ResumeDiff original={original} improved={plainRewrite} />
            </Suspense>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
