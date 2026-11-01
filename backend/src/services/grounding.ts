// The rewrite prompt forbids invented skills, but a prompt is a request, not a guarantee. In a live
// run, tailoring a resume that lists "React, TypeScript, Node.js, AWS" to a job asking for Docker and
// Kubernetes produced a rewrite claiming Docker, Kubernetes, CI/CD, PostgreSQL and GitHub Actions.
// This check flags such claims deterministically: a named term (tool, technology, title word) that
// the job ad asks for and the rewrite contains, but the original resume never mentions.
import { GENERIC } from './semantic/lexical.js';

const TOKEN = /[A-Za-z0-9][A-Za-z0-9+#./-]*[A-Za-z0-9+#]|[A-Za-z0-9]/g;
const PREFIX = 5;

const normalize = (token: string) => token.toLowerCase().replace(/[^a-z0-9+#]/g, '');

function words(text: string): string[] {
  return text.match(TOKEN)?.map(normalize).filter(Boolean) ?? [];
}

// Builds a membership test that tolerates inflection and spelling variants:
// Docker ↔ Dockerized, Postgres ↔ PostgreSQL, Node ↔ Node.js, "CI / CD" ↔ CI/CD.
function vocabulary(text: string) {
  const tokens = words(text);
  const exact = new Set(tokens);
  tokens.forEach((token, i) => i > 0 && exact.add(tokens[i - 1] + token));
  const prefixes = new Set(tokens.filter(t => t.length >= PREFIX).map(t => t.slice(0, PREFIX)));
  return (term: string) =>
    exact.has(term) ||
    exact.has(`${term}js`) ||
    (term.endsWith('js') && exact.has(term.slice(0, -2))) ||
    (term.length >= PREFIX && prefixes.has(term.slice(0, PREFIX)));
}

const BLOCK_PREFIX = /^\s*(?:[-*•>]|\d+[.)])?\s*$/;
const SENTENCE_END = /[.!?·|•]$/;

// A capitalised word at the start of a line or sentence ("Led", "Built") says nothing; a capital
// elsewhere (Docker, Kubernetes), inner capitals (GitHub, AWS, CI/CD) or a symbol (C++, C#) do.
function isNamed(token: string, before: string): boolean {
  if (/[+#]/.test(token) || /[A-Z]/.test(token.slice(1))) return true;
  if (!/^[A-Z]/.test(token)) return false;
  const lead = before.replace(/[*_"'(\s]+$/, '');
  return !BLOCK_PREFIX.test(lead) && !SENTENCE_END.test(lead);
}

/** Named terms in `rewrite` that come from `jobDescription` but have no support in `original`, in order of appearance. */
export function unsupportedTerms(original: string, jobDescription: string, rewrite: string): string[] {
  const inResume = vocabulary(original);
  const inJob = vocabulary(jobDescription);
  const found = new Map<string, string>();

  for (const line of rewrite.split('\n')) {
    if (line.trimStart().startsWith('#')) continue; // headings and the candidate's name
    let phrase: { text: string; end: number } | null = null;
    const flush = () => {
      if (phrase && !found.has(normalize(phrase.text))) found.set(normalize(phrase.text), phrase.text);
      phrase = null;
    };

    for (const match of line.matchAll(TOKEN)) {
      const token = match[0];
      const term = normalize(token);
      const start = match.index;
      const flagged =
        term.length >= 2 &&
        /[a-z]/.test(term) &&
        !GENERIC.has(term) &&
        isNamed(token, line.slice(0, start)) &&
        inJob(term) &&
        !inResume(term);
      if (!flagged) {
        flush();
        continue;
      }
      // Keep multi-word names together: "GitHub Actions", not "GitHub" and "Actions"
      if (phrase && line.slice(phrase.end, start) === ' ') phrase = { text: `${phrase.text} ${token}`, end: start + token.length };
      else {
        flush();
        phrase = { text: token, end: start + token.length };
      }
    }
    flush();
  }
  return [...found.values()];
}
