import { useRef, useState } from 'react';
import { Copy, Download, FileText, RefreshCw, Square } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Kbd } from '@/components/common/Kbd';
import { RequestError } from '@/components/common/RequestError';
import { useAIStream } from '@/hooks/useAI';
import { SUBMIT_SHORTCUT_LABEL, useSubmitShortcut } from '@/hooks/useSubmitShortcut';
import { exportElementToPdf, exportTextToDocx } from '@/lib/exportDocument';
import { LIMITS } from '@/lib/limits';
import { generateCoverLetter } from '@/services/resumeApi';

interface CoverLetterPanelProps {
  resume: string;
  jobDescription: string;
}

export const CoverLetterPanel = ({ resume, jobDescription }: CoverLetterPanelProps) => {
  const [applicantName, setApplicantName] = useState('');
  const stream = useAIStream();
  const paperRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const coverLetter = stream.text;

  const generate = async () => {
    if (stream.isPending) return;
    const outcome = await stream.run((signal, onChunk) =>
      generateCoverLetter(resume, jobDescription, applicantName, onChunk, { signal })
    );
    if (outcome.status === 'success') toast({ title: 'Cover letter ready', description: 'Preview and download below.' });
  };
  const onKeyDown = useSubmitShortcut(generate);

  async function download(kind: 'pdf' | 'docx' | 'copy') {
    try {
      if (kind === 'copy') await navigator.clipboard.writeText(coverLetter);
      if (kind === 'pdf' && paperRef.current) await exportElementToPdf(paperRef.current, 'cover-letter.pdf');
      if (kind === 'docx') await exportTextToDocx(coverLetter, 'cover-letter.docx');
      toast({ title: kind === 'copy' ? 'Copied to clipboard' : 'Downloaded' });
    } catch {
      toast({ title: 'Something went wrong', description: 'Please try again.', variant: 'destructive' });
    }
  }

  return (
    <div className="space-y-6">
      <Card onKeyDown={onKeyDown}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" aria-hidden />
            Cover letter
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="applicant-name">Your name (optional)</Label>
              <Input
                id="applicant-name"
                value={applicantName}
                maxLength={LIMITS.applicantName.max}
                onChange={e => setApplicantName(e.target.value)}
                placeholder="Jane Smith"
              />
            </div>
            {stream.isPending ? (
              <Button variant="outline" onClick={stream.abort}>
                <Square className="fill-current" /> Stop
              </Button>
            ) : (
              <Button onClick={generate}>
                <FileText /> Generate cover letter
                <Kbd className="ml-1 hidden border-primary-foreground/30 bg-transparent text-primary-foreground/80 sm:inline-flex">
                  {SUBMIT_SHORTCUT_LABEL}
                </Kbd>
              </Button>
            )}
          </div>
          {stream.status === 'error' && stream.error && <RequestError error={stream.error} onRetry={generate} />}
        </CardContent>
      </Card>

      {(coverLetter || stream.isPending) && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                Preview
                {stream.isPending && (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    <RefreshCw className="h-3 w-3 animate-spin" aria-hidden /> Writing…
                  </span>
                )}
                {stream.status === 'aborted' && <span className="text-xs font-normal text-muted-foreground">Stopped</span>}
              </CardTitle>

              {!stream.isPending && coverLetter && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => download('copy')}>
                    <Copy /> Copy
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => download('pdf')}>
                    <Download /> PDF
                  </Button>
                  <Button size="sm" onClick={() => download('docx')}>
                    <FileText /> Word
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {/* Paper keeps print colors in both themes so it matches the exported PDF */}
            <div
              ref={paperRef}
              aria-live={stream.isPending ? 'polite' : undefined}
              aria-busy={stream.isPending}
              className="min-h-[500px] rounded-md bg-white p-8 text-zinc-900 shadow-sm ring-1 ring-black/5 sm:p-12"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              {coverLetter ? (
                <div>
                  {coverLetter.split('\n').map((line, i) =>
                    line.trim() ? (
                      <p key={i} className="text-sm leading-relaxed text-zinc-800">{line}</p>
                    ) : (
                      <div key={i} className="h-3" />
                    )
                  )}
                  {stream.isPending && <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-zinc-900 align-middle" />}
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
