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

export async function extractPdfText(file: File): Promise<string> {
  const [pdfjs, { default: workerSrc }] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.mjs?url'),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

  // isEvalSupported:false keeps pdf.js from trying `new Function` (blocked by our CSP; not needed for text)
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer(), isEvalSupported: false }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const content = await (await pdf.getPage(i)).getTextContent();
    pages.push(content.items.map(item => ('str' in item ? item.str : '')).join(' '));
  }
  return pages.join('\n').trim();
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
