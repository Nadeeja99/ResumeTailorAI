import { useState } from 'react';
import { FileText, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { PdfPreview } from './PdfPreview';

/** An uploaded PDF together with the text extracted from it. */
export interface ResumeSource {
  file: File;
  text: string;
}

interface OriginalResumeProps {
  /** The resume text the AI works with. */
  text: string;
  source: ResumeSource | null;
}

const VIEWS = [
  { value: 'pdf', label: 'Original PDF' },
  { value: 'text', label: 'What the AI reads' },
] as const;

/** Paper showing text exactly as entered — line breaks and spacing preserved, no re-styling. */
function VerbatimText({ text }: { text: string }) {
  return (
    <div className="rounded-md bg-white p-8 text-zinc-900 shadow-sm ring-1 ring-black/5 sm:p-10">
      <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed">{text}</pre>
    </div>
  );
}

/** The user's own resume: the uploaded PDF rendered exactly, or their text verbatim. */
export function OriginalResume({ text, source }: OriginalResumeProps) {
  const [view, setView] = useState<'pdf' | 'text'>('pdf');
  // Once the text is edited, the PDF no longer shows what will be analysed
  const pdfMatches = source !== null && source.text === text;
  const showPdf = pdfMatches && view === 'pdf';

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" aria-hidden />
          Your resume
        </CardTitle>
        {pdfMatches && (
          <div role="group" aria-label="Resume view" className="flex gap-1 rounded-md border bg-card p-1">
            {VIEWS.map(v => (
              <button
                key={v.value}
                type="button"
                aria-pressed={view === v.value}
                onClick={() => setView(v.value)}
                className={cn(
                  'rounded-sm px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  view === v.value ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {v.label}
              </button>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {source && !pdfMatches && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Showing your edited text — it no longer matches the uploaded PDF.
          </p>
        )}
        {showPdf ? (
          <div className="rounded-md bg-muted/40 p-3 sm:p-6">
            <PdfPreview file={source.file} fallback={<VerbatimText text={text} />} />
          </div>
        ) : (
          <VerbatimText text={text} />
        )}
      </CardContent>
    </Card>
  );
}
