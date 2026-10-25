import { useState } from 'react';
import { CheckCircle2, Linkedin, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { useAITask } from '@/hooks/useAI';
import { extractPdfText } from '@/lib/fileParsing';
import { getErrorMessage } from '@/lib/utils';
import { parseLinkedIn } from '@/services/resumeApi';

type Step = 'idle' | 'extracting' | 'parsing' | 'done';

const STEP_LABEL: Record<Exclude<Step, 'idle'>, string> = {
  extracting: 'Extracting text from PDF…',
  parsing: 'AI is structuring your LinkedIn profile…',
  done: 'Profile imported.',
};

export function LinkedInImport({ onImported }: { onImported: (resume: string) => void }) {
  const [step, setStep] = useState<Step>('idle');
  const task = useAITask<{ resume: string }>();
  const { toast } = useToast();

  async function handleFile(file: File) {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast({ title: 'PDF required', description: 'Upload the PDF exported from LinkedIn.', variant: 'destructive' });
      return;
    }

    let rawText: string;
    try {
      setStep('extracting');
      rawText = await extractPdfText(file);
    } catch (error) {
      setStep('idle');
      toast({ title: 'Import failed', description: getErrorMessage(error, 'Could not read that PDF.'), variant: 'destructive' });
      return;
    }

    setStep('parsing');
    const outcome = await task.run(signal => parseLinkedIn(rawText, { signal }));
    if (outcome.status === 'success') {
      onImported(outcome.result.data.resume);
      setStep('done');
      toast({ title: 'LinkedIn profile imported', description: 'Review and edit it on the Paste tab.' });
    } else {
      setStep('idle');
      if (outcome.status === 'error') {
        toast({ title: 'Import failed', description: outcome.error.message, variant: 'destructive' });
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-lg border bg-muted/40 p-4 text-sm">
        <p className="flex items-center gap-2 font-medium">
          <Linkedin className="h-4 w-4" aria-hidden /> Export your LinkedIn profile as PDF
        </p>
        <ol className="list-inside list-decimal space-y-1 text-xs text-muted-foreground">
          <li>Open your LinkedIn profile</li>
          <li>
            Click <strong>More</strong> → <strong>Save to PDF</strong>
          </li>
          <li>Upload the downloaded PDF below</li>
        </ol>
      </div>

      <div className="rounded-lg border border-dashed p-8 text-center" aria-live="polite">
        {step === 'idle' && (
          <>
            <Linkedin className="mx-auto mb-3 h-8 w-8 text-muted-foreground" aria-hidden />
            <p className="mb-4 text-sm text-muted-foreground">AI will untangle LinkedIn’s multi-column layout.</p>
            <input
              type="file"
              accept=".pdf"
              id="linkedin-upload"
              className="sr-only"
              onChange={e => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) void handleFile(file);
              }}
            />
            <Button asChild variant="outline">
              <label htmlFor="linkedin-upload" className="cursor-pointer">
                Choose LinkedIn PDF
              </label>
            </Button>
          </>
        )}

        {(step === 'extracting' || step === 'parsing') && (
          <div className="space-y-3 py-2">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" aria-hidden />
            <p className="text-sm font-medium">{STEP_LABEL[step]}</p>
            <Progress value={step === 'extracting' ? 33 : 66} className="mx-auto h-1.5 w-48" />
            {step === 'parsing' && (
              <Button variant="ghost" size="sm" onClick={task.abort}>
                Cancel
              </Button>
            )}
          </div>
        )}

        {step === 'done' && (
          <div className="space-y-3 py-2">
            <CheckCircle2 className="mx-auto h-8 w-8 text-success" aria-hidden />
            <p className="text-sm font-medium text-success">{STEP_LABEL.done}</p>
            <Button variant="ghost" size="sm" onClick={() => setStep('idle')}>
              Import another
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
