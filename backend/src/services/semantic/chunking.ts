const SECTION_HEADERS = [
  'summary', 'objective', 'profile',
  'experience', 'work experience', 'employment',
  'education', 'skills', 'technical skills',
  'projects', 'certifications', 'achievements', 'awards',
];

const MIN_SECTION_CHARS = 20;
const MIN_EVIDENCE_CHARS = 20;
const MAX_EVIDENCE_CHARS = 300;
/** Keeps a single embedding batch (JD + sections + evidence) under Gemini's 100-input limit. */
export const MAX_EVIDENCE_CHUNKS = 80;

export interface EvidenceChunk {
  section: string;
  text: string;
}

const titleCase = (name: string) => name.charAt(0).toUpperCase() + name.slice(1);

/** Splits resume text into named sections by recognising common headings. */
export function extractResumeSections(resume: string): Record<string, string> {
  const sections: Record<string, string[]> = { intro: [] };
  let current = 'intro';

  for (const line of resume.split('\n')) {
    const lower = line.trim().toLowerCase().replace(/^#+\s*/, '');
    const matched = SECTION_HEADERS.find(h => lower === h || lower.startsWith(h + ':') || lower.startsWith(h + ' '));
    if (matched) {
      current = matched.split(' ')[0]; // normalise to first word
      sections[current] ??= [];
    } else {
      (sections[current] ??= []).push(line);
    }
  }

  const nonEmpty = Object.fromEntries(
    Object.entries(sections)
      .map(([name, lines]) => [titleCase(name), lines.join('\n').trim()])
      .filter(([, text]) => text.length > MIN_SECTION_CHARS)
  );
  // No recognisable headings → treat the resume as a single section
  const names = Object.keys(nonEmpty);
  return names.length === 0 || (names.length === 1 && names[0] === 'Intro') ? { Resume: resume.trim() } : nonEmpty;
}

function splitLong(line: string): string[] {
  if (line.length <= MAX_EVIDENCE_CHARS) return [line];
  return line.split(/(?<=[.;!?])\s+/).filter(Boolean);
}

/**
 * Line-level chunks used as evidence for requirement coverage. Matching a requirement against
 * a single bullet ("Mentored 4 engineers…") separates hits from misses far better than matching
 * it against a whole section, where unrelated lines dilute the similarity.
 */
export function buildEvidenceChunks(sections: Record<string, string>): EvidenceChunk[] {
  let chunks: EvidenceChunk[] = Object.entries(sections).flatMap(([section, text]) =>
    text
      .split('\n')
      .map(line => line.replace(/^[\s•*-]+/, '').trim())
      .flatMap(splitLong)
      .filter(line => line.length >= MIN_EVIDENCE_CHARS)
      .map(line => ({ section, text: line }))
  );

  // Very long resumes: merge neighbours (within a section) until the batch fits
  while (chunks.length > MAX_EVIDENCE_CHUNKS) {
    const merged: EvidenceChunk[] = [];
    for (let i = 0; i < chunks.length; i += 2) {
      const next = chunks[i + 1];
      merged.push(
        next && next.section === chunks[i].section
          ? { section: chunks[i].section, text: `${chunks[i].text} ${next.text}` }
          : chunks[i]
      );
      if (next && next.section !== chunks[i].section) merged.push(next);
    }
    if (merged.length === chunks.length) break;
    chunks = merged;
  }
  return chunks.slice(0, MAX_EVIDENCE_CHUNKS);
}
