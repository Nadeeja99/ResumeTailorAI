import { useRef, useState, type ReactNode } from 'react';
import { Download, Eye, FileText, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Markdown } from '@/components/ai/Markdown';
import { exportElementToPdf, exportMarkdownToDocx } from '@/lib/exportDocument';

interface ResumePreviewProps {
  /** The AI-tailored resume in Markdown (prompt v2). The user's own resume is shown by OriginalResume. */
  resume: string;
  isStreaming?: boolean;
  suggestions?: string[];
  /** Rendered in the card header, e.g. live stream controls. */
  status?: ReactNode;
  /** Rendered under the preview card, e.g. the telemetry drawer. */
  footer?: ReactNode;
}

export const ResumePreview = ({ resume, isStreaming = false, suggestions = [], status, footer }: ResumePreviewProps) => {
  const paperRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState<'pdf' | 'docx' | null>(null);
  const { toast } = useToast();

  async function download(kind: 'pdf' | 'docx') {
    setExporting(kind);
    try {
      if (kind === 'pdf' && paperRef.current) await exportElementToPdf(paperRef.current, 'tailored-resume.pdf');
      if (kind === 'docx') await exportMarkdownToDocx(resume, 'tailored-resume.docx');
      toast({ title: 'Downloaded', description: `Resume saved as ${kind === 'pdf' ? 'PDF' : 'Word document'}.` });
    } catch {
      toast({ title: 'Export failed', description: 'Could not create the file. Please try again.', variant: 'destructive' });
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" aria-hidden />
              Resume preview
            </CardTitle>
            {status}
            {!isStreaming && (
              <div className="flex gap-2">
                <Button onClick={() => download('pdf')} variant="outline" size="sm" disabled={!resume.trim() || !!exporting}>
                  {exporting === 'pdf' ? <Loader2 className="animate-spin" /> : <Download />} PDF
                </Button>
                <Button onClick={() => download('docx')} size="sm" disabled={!resume.trim() || !!exporting}>
                  {exporting === 'docx' ? <Loader2 className="animate-spin" /> : <FileText />} Word
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Paper keeps print colors in both themes so it matches the exported PDF */}
          <div
            ref={paperRef}
            aria-live={isStreaming ? 'polite' : undefined}
            aria-busy={isStreaming}
            className="min-h-[600px] rounded-md bg-white p-8 text-zinc-900 shadow-sm ring-1 ring-black/5 sm:p-10"
            style={{ fontFamily: 'Arial, sans-serif' }}
          >
            {resume ? (
              <div className="space-y-1">
                <Markdown content={resume} variant="paper" />
                {isStreaming && <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-zinc-900 align-middle" />}
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center gap-2 text-zinc-400">
                {isStreaming && <RefreshCw className="h-4 w-4 animate-spin" aria-hidden />}
                <p>{isStreaming ? 'Writing your tailored resume…' : 'Resume content will appear here.'}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {footer}

      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Applied improvements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s, i) => (
                <Badge key={i} variant="secondary" className="font-normal">{s}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
