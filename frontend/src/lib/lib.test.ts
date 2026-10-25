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
