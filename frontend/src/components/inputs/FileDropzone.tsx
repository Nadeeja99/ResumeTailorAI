import { useState, type DragEvent } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { ACCEPTED_FILE_TYPES, extractTextFromFile } from '@/lib/fileParsing';
import { cn, getErrorMessage } from '@/lib/utils';

interface FileDropzoneProps {
  id: string;
  /** What the file is, e.g. "your resume". */
  subject: string;
  onText: (text: string, file: File) => void;
}

/** Drag-and-drop / picker that extracts text from .txt, .pdf or .docx files. */
export function FileDropzone({ id, subject, onText }: FileDropzoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  async function handleFile(file: File) {
    setProcessing(true);
    try {
      onText(await extractTextFromFile(file), file);
      toast({ title: 'File imported', description: `Extracted text from ${file.name}.` });
    } catch (error) {
      toast({ title: 'Upload failed', description: getErrorMessage(error, 'Could not read that file.'), variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  }

  const onDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const onDrop = (e: DragEvent) => {
    onDrag(e);
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file && !processing) void handleFile(file);
  };

  return (
    <div
      onDragEnter={onDrag}
      onDragLeave={onDrag}
      onDragOver={onDrag}
      onDrop={onDrop}
      aria-busy={processing}
      className={cn(
        'rounded-lg border border-dashed p-8 text-center transition-colors',
        dragActive ? 'border-primary bg-primary/5' : 'hover:border-primary/50',
        processing && 'bg-muted/40'
      )}
    >
      {processing ? (
        <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" aria-hidden />
      ) : (
        <Upload className="mx-auto mb-3 h-8 w-8 text-muted-foreground" aria-hidden />
      )}
      <p className="mb-4 text-sm text-muted-foreground">
        {processing ? 'Reading your file…' : `Drag and drop ${subject}, or choose a file`}
      </p>
      <input
        type="file"
        id={id}
        accept={ACCEPTED_FILE_TYPES}
        className="sr-only"
        disabled={processing}
        onChange={e => {
          const file = e.target.files?.[0];
          e.target.value = ''; // allow re-selecting the same file
          if (file) void handleFile(file);
        }}
      />
      <Button asChild variant="outline" disabled={processing}>
        <label htmlFor={id} className="cursor-pointer">
          Choose file
        </label>
      </Button>
      <p className="mt-3 text-xs text-muted-foreground">.txt, .pdf or .docx · up to 10 MB</p>
    </div>
  );
}
