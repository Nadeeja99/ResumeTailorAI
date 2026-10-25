import { useEffect, useRef, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { loadPdfJs } from '@/lib/fileParsing';

interface PdfPreviewProps {
  file: File;
  /** Shown if the PDF can't be rendered (e.g. corrupt file). */
  fallback: React.ReactNode;
}

const useDebouncedWidth = (ref: React.RefObject<HTMLElement>, delayMs = 150) => {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let timer: ReturnType<typeof setTimeout>;
    const observer = new ResizeObserver(([entry]) => {
      clearTimeout(timer);
      timer = setTimeout(() => setWidth(Math.round(entry.contentRect.width)), delayMs);
    });
    observer.observe(el);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [ref, delayMs]);
  return width;
};

/** Renders the uploaded PDF's pages exactly as designed (pdf.js → canvas), sized to the container. */
export function PdfPreview({ file, fallback }: PdfPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const width = useDebouncedWidth(containerRef);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    if (!width || !pagesRef.current) return;
    const host = pagesRef.current;
    let cancelled = false;
    let destroy: (() => Promise<void>) | undefined;

    (async () => {
      try {
        const pdfjs = await loadPdfJs();
        const doc = await pdfjs.getDocument({ data: await file.arrayBuffer(), isEvalSupported: false }).promise;
        destroy = () => doc.destroy();
        const canvases: HTMLCanvasElement[] = [];
        for (let n = 1; n <= doc.numPages && !cancelled; n++) {
          const page = await doc.getPage(n);
          const scale = (width / page.getViewport({ scale: 1 }).width) * (window.devicePixelRatio || 1);
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement('canvas');
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.className = 'block h-auto w-full rounded-sm bg-white shadow-sm ring-1 ring-black/5';
          canvas.setAttribute('role', 'img');
          canvas.setAttribute('aria-label', `Page ${n} of ${doc.numPages}`);
          await page.render({ canvas, viewport }).promise;
          canvases.push(canvas);
        }
        if (cancelled) return;
        host.replaceChildren(...canvases);
        setStatus('ready');
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      void destroy?.();
    };
  }, [file, width]);

  if (status === 'error') return <>{fallback}</>;

  return (
    <div ref={containerRef} className="w-full">
      {status === 'loading' && <Skeleton className="aspect-[1/1.414] w-full" aria-label="Rendering PDF" />}
      <div ref={pagesRef} className="flex flex-col gap-4" hidden={status !== 'ready'} />
    </div>
  );
}
