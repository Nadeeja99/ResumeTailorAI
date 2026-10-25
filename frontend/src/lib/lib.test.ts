import { describe, expect, it } from 'vitest';
import { classifyLine } from './exportDocument';
import { extractTextFromFile, MAX_FILE_BYTES } from './fileParsing';
import { heuristicAnalyze } from './heuristicAnalysis';
import { isValidLength, lengthError, LIMITS } from './limits';

describe('limits', () => {
  it('treats empty input as not started rather than invalid', () => {
    expect(lengthError('Resume', '   ', LIMITS.resume)).toBeNull();
    expect(isValidLength('   ', LIMITS.resume)).toBe(false);
  });

  it('mirrors the backend min/max rules', () => {
    expect(lengthError('Resume', 'too short', LIMITS.resume)).toMatch(/at least 50 characters \(9 so far\)/);
    expect(lengthError('Resume', 'a'.repeat(15_001), LIMITS.resume)).toMatch(/under 15,000/);
    expect(isValidLength('a'.repeat(50), LIMITS.resume)).toBe(true);
  });
});

describe('extractTextFromFile', () => {
  it('reads plain-text files (by extension when the MIME type is missing)', async () => {
    const file = new File(['  Jane Doe\nEngineer  '], 'resume.txt', { type: '' });
    await expect(extractTextFromFile(file)).resolves.toBe('Jane Doe\nEngineer');
  });

  it('rejects unsupported, legacy .doc, empty and oversized files with helpful messages', async () => {
    await expect(extractTextFromFile(new File(['x'], 'photo.png', { type: 'image/png' }))).rejects.toThrow(/Unsupported file type/);
    await expect(extractTextFromFile(new File(['x'], 'old.doc'))).rejects.toThrow(/\.doc files aren’t supported/);
    await expect(extractTextFromFile(new File(['   '], 'blank.txt'))).rejects.toThrow(/No text found/);

    const huge = new File(['x'], 'big.txt');
    Object.defineProperty(huge, 'size', { value: MAX_FILE_BYTES + 1 });
    await expect(extractTextFromFile(huge)).rejects.toThrow(/larger than 10 MB/);
  });
});

describe('classifyLine', () => {
  it.each([
    ['EXPERIENCE', 'heading'],
    ['Skills: React, Node', 'heading'],
    ['• Led a team of 4', 'bullet'],
    ['- AWS, GCP', 'bullet'],
    ['2021 - 2024', 'text'],
    ['Built scalable services', 'text'],
    ['   ', 'blank'],
  ])('%s → %s', (line, kind) => {
    expect(classifyLine(line)).toBe(kind);
  });
});

describe('heuristicAnalyze', () => {
  it('scores keyword overlap and lists missing terms', () => {
    const result = heuristicAnalyze('Senior React and TypeScript engineer', 'Looking for React, TypeScript and Kubernetes skills');

    expect(result.matchScore).toBeGreaterThan(0);
    expect(result.matchScore).toBeLessThan(100);
    expect(result.missingKeywords).toContain('kubernetes');
    expect(result.strengths).toContain('Matched skill: react');
  });
});

describe('markdownBlocks', async () => {
  const { parseMarkdownBlocks, markdownToPlainText, parseInline } = await import('./markdownBlocks');

  it('parses headings, bullets, paragraphs and inline emphasis', () => {
    const blocks = parseMarkdownBlocks('# Jane Doe\n## Experience\n**Lead** · Acme · 2021\n- Cut costs by *30%* using `k8s`\n---');
    expect(blocks.map(b => b.kind)).toEqual(['h1', 'h2', 'paragraph', 'bullet']);
    expect(blocks[2].runs[0]).toEqual({ text: 'Lead', bold: true });
    expect(blocks[3].runs).toEqual([
      { text: 'Cut costs by ' },
      { text: '30%', italic: true },
      { text: ' using ' },
      { text: 'k8s', code: true },
    ]);
  });

  it('keeps fenced code verbatim', () => {
    expect(parseMarkdownBlocks('```\n# not a heading\n```')).toEqual([{ kind: 'code', runs: [{ text: '# not a heading', code: true }] }]);
  });

  it('flattens to readable text for diffing against a plain resume', () => {
    expect(markdownToPlainText('# Jane\n## Skills\n- **React**, TypeScript')).toBe('Jane\n\nSKILLS\n• React, TypeScript');
  });

  it('leaves unmatched markers alone', () => {
    expect(parseInline('5 * 3 = 15')).toEqual([{ text: '5 * 3 = 15' }]);
  });
});

describe('positionedTextToString (PDF layout rebuild)', async () => {
  const { positionedTextToString } = await import('./fileParsing');
  // Helper: a fragment at (x, y) with a 10pt font; width ≈ 5pt per character
  const t = (str: string, x: number, y: number) => ({ str, transform: [10, 0, 0, 10, x, y], width: str.length * 5, height: 10 });

  it('keeps lines, paragraph gaps and word spacing', () => {
    const text = positionedTextToString([
      t('Jane Doe', 50, 800),
      t('Software Engineer', 50, 786), // next line
      t('EXPERIENCE', 50, 750), // big gap → new paragraph
      t('Led the', 50, 736),
      t('migration', 90, 736), // same line, normal gap → space
    ]);
    expect(text).toBe('Jane Doe\nSoftware Engineer\n\nEXPERIENCE\nLed the migration');
  });

  it('does not insert spaces inside words split across fragments', () => {
    expect(positionedTextToString([t('Engin', 50, 700), t('eer', 75, 700)])).toBe('Engineer');
  });

  it('keeps visible separation for right-aligned columns', () => {
    expect(positionedTextToString([t('Senior Engineer', 50, 700), t('2021 – 2024', 400, 700)])).toBe('Senior Engineer    2021 – 2024');
  });

  it('ignores empty end-of-line markers and standalone space fragments', () => {
    const text = positionedTextToString([
      t('Software Engineer, Fortude', 50, 700),
      t(' ', 180, 700), // wide space fragment spanning the column gap
      t('01/2021 – Present', 400, 700),
      t('', 485, 694), // empty EOL marker at its own y
      t('Led a platform for 400+ users', 50, 686),
    ]);
    expect(text).toBe('Software Engineer, Fortude    01/2021 – Present\nLed a platform for 400+ users');
  });

  it('keeps the space carried by a fragment boundary', () => {
    expect(positionedTextToString([t('React, ', 50, 700), t('Node.js', 85, 700)])).toBe('React, Node.js');
  });
});

it('classifyLine treats long lines that merely start with a section word as text', () => {
  expect(classifyLine('PROJECTS LEARNMATE AI, AI-POWERED DOCUMENT ANALYSIS AND VOICE CHAT FOR STUDENTS')).toBe('text');
  expect(classifyLine('PROJECTS')).toBe('heading');
});
