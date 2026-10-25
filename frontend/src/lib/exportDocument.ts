// PDF / Word export shared by the resume preview and cover letter.
// Export libraries load on first use to keep them out of the initial bundle.

export type LineKind = 'heading' | 'bullet' | 'text' | 'blank';

const SECTION_HEADING = /^(EXPERIENCE|EDUCATION|SKILLS|CONTACT|SUMMARY|OBJECTIVE|PROJECTS|CERTIFICATIONS)/i;
const BULLET = /^[•*-]/;

/** Classifies a plain-text resume line; used by both the on-screen preview and the DOCX export. */
export function classifyLine(line: string): LineKind {
  const trimmed = line.trim();
  if (!trimmed) return 'blank';
  if (BULLET.test(trimmed)) return 'bullet';
  // All-caps lines ("WORK HISTORY") or known section names; digit-only lines like dates are not headings
  if (trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed)) return 'heading';
  if (SECTION_HEADING.test(trimmed)) return 'heading';
  return 'text';
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Rasterises an on-screen "paper" element into a multi-page A4 PDF. */
export async function exportElementToPdf(element: HTMLElement, filename: string): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);

  const canvas = await html2canvas(element, { scale: 2, useCORS: true });
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const pageHeight = 297;
  const imgHeight = (canvas.height * pageWidth) / canvas.width;

  let position = 0;
  pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight);
  let heightLeft = imgHeight - pageHeight;
  while (heightLeft > 0) {
    position -= pageHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight);
    heightLeft -= pageHeight;
  }
  pdf.save(filename);
}

/** Writes plain text to .docx. With `structured`, resume headings and bullets get Word styles. */
export async function exportTextToDocx(text: string, filename: string, { structured = false } = {}): Promise<void> {
  const { Document, HeadingLevel, Packer, Paragraph, TextRun } = await import('docx');

  const paragraphs = text.split('\n').map(line => {
    const kind = structured ? classifyLine(line) : line.trim() ? 'text' : 'blank';
    const trimmed = line.trim();
    if (kind === 'heading') {
      return new Paragraph({ text: trimmed, heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 } });
    }
    return new Paragraph({
      children: [new TextRun({ text: trimmed || ' ', size: structured ? 22 : 24 })],
      bullet: kind === 'bullet' ? { level: 0 } : undefined,
      spacing: { after: kind === 'blank' ? 0 : structured ? 80 : 160 },
    });
  });

  const doc = new Document({ sections: [{ properties: {}, children: paragraphs }] });
  downloadBlob(await Packer.toBlob(doc), filename);
}
