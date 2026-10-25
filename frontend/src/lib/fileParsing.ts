// Text extraction for uploaded resumes / job descriptions. Parsers are loaded on demand
// so pdf.js (~2 MB with its worker) and mammoth stay out of the initial bundle.

export const ACCEPTED_FILE_TYPES = '.txt,.pdf,.docx';
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

type FileKind = 'text' | 'pdf' | 'docx';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

// Some browsers/OSes leave `file.type` empty, so fall back to the extension.
function kindOf(file: File): FileKind | null {
  const name = file.name.toLowerCase();
  if (file.type === 'text/plain' || name.endsWith('.txt')) return 'text';
  if (file.type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
  if (file.type === DOCX_MIME || name.endsWith('.docx')) return 'docx';
  return null;
}

// FileReader rather than Blob.text(): broader browser support (older Safari) and available in jsdom.
function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read that file.'));
    reader.readAsText(file);
  });
}

let pdfjsLoader: Promise<typeof import('pdfjs-dist')> | null = null;

/** Lazily loads pdf.js and its worker once; shared by text extraction and the PDF preview. */
export function loadPdfJs(): Promise<typeof import('pdfjs-dist')> {
  pdfjsLoader ??= Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.mjs?url')]).then(
    ([pdfjs, { default: workerSrc }]) => {
      pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
      return pdfjs;
    }
  );
  return pdfjsLoader;
}

/** The parts of a pdf.js TextItem needed to rebuild layout. transform = [a, b, c, d, x, y]. */
export interface PositionedText {
  str: string;
  transform: number[];
  width: number;
  height: number;
}

/**
 * Rebuilds lines and paragraphs from positioned PDF text. pdf.js returns text as fragments with
 * coordinates, not lines — joining them blindly turns a resume into one wall of text.
 */
export function positionedTextToString(items: PositionedText[]): string {
  let out = '';
  let prev: { y: number; xEnd: number; size: number; trailingSpace: boolean } | null = null;

  for (const item of items) {
    // Empty end-of-line markers and standalone spaces carry their own coordinates; laying them out
    // would add phantom line breaks and hide column gaps. Spacing is derived from real text only.
    const text = item.str.trim();
    if (!text) continue;

    const [, , , d, x, y] = item.transform;
    const size = item.height || Math.abs(d) || 10;
    if (prev) {
      const dy = Math.abs(y - prev.y);
      if (dy > size * 0.5) {
        out += dy > Math.max(size, prev.size) * 1.8 ? '\n\n' : '\n'; // larger gap → new paragraph
      } else {
        const gap = x - prev.xEnd;
        if (gap > size * 2) out += '    '; // wide gap, e.g. a right-aligned date column
        else if (gap > size * 0.15 || prev.trailingSpace || /^\s/.test(item.str)) out += ' ';
      }
    }
    out += text;
    prev = { y, xEnd: x + item.width, size, trailingSpace: /\s$/.test(item.str) };
  }
  return out.replace(/\n{3,}/g, '\n\n').trim();
}

export async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await loadPdfJs();
  // isEvalSupported:false keeps pdf.js from trying `new Function` (blocked by our CSP; not needed for text)
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer(), isEvalSupported: false }).promise;
  try {
    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const content = await (await pdf.getPage(i)).getTextContent();
      pages.push(positionedTextToString(content.items.filter((item): item is PositionedText & typeof item => 'str' in item)));
    }
    return pages.join('\n\n').trim();
  } finally {
    void pdf.destroy();
  }
}

async function extractDocxText(file: File): Promise<string> {
  const { default: mammoth } = await import('mammoth');
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return result.value.trim();
}

export async function extractTextFromFile(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) throw new Error('That file is larger than 10 MB.');

  const kind = kindOf(file);
  if (!kind) {
    const legacyWord = file.name.toLowerCase().endsWith('.doc');
    throw new Error(
      legacyWord
        ? 'Legacy .doc files aren’t supported. Save it as .docx or PDF and try again.'
        : 'Unsupported file type. Upload a .txt, .pdf or .docx file.'
    );
  }

  const text =
    kind === 'text' ? (await readAsText(file)).trim() : kind === 'pdf' ? await extractPdfText(file) : await extractDocxText(file);
  if (!text) {
    throw new Error('No text found in that file. Scanned (image-only) PDFs aren’t supported — paste the text instead.');
  }
  return text;
}
