// Lexical half of hybrid requirement matching. Embeddings alone rate a dense skills line
// ("React, TypeScript, Node.js, AWS") as close to *any* tech requirement — e.g. "Docker
// containerization" scored 0.70 against it in live testing. Requiring at least one distinctive
// requirement term to appear in the resume removes those false positives.

// Generic words that don't identify a requirement on their own.
const GENERIC = new Set([
  'a', 'an', 'and', 'or', 'the', 'of', 'in', 'on', 'for', 'to', 'with', 'using', 'via', 'plus', 'based',
  'experience', 'experienced', 'expertise', 'knowledge', 'understanding', 'familiarity', 'background',
  'skill', 'skills', 'strong', 'excellent', 'solid', 'good', 'proven', 'deep', 'hands', 'ability', 'abilities',
  'proficiency', 'proficient', 'years', 'year', 'level', 'senior', 'junior', 'lead', 'work', 'working',
  'development', 'developing', 'developer', 'engineer', 'engineers', 'engineering', 'programming', 'integration', 'implementation',
  'application', 'applications', 'solutions', 'systems', 'tools', 'technologies', 'practices', 'platform',
]);

const PREFIX = 5;
const key = (token: string) => token.slice(0, PREFIX);

function tokens(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9+#.]+/g)?.map(t => t.replace(/\.+$/, '')).filter(Boolean) ?? [];
}

/** Distinctive terms of a requirement (generic words removed). */
export function salientTerms(requirement: string): string[] {
  return tokens(requirement).filter(t => t.length >= 2 && !GENERIC.has(t));
}

/** Builds a matcher over the resume vocabulary; prefix matching tolerates inflection (mentoring ↔ mentored). */
export function keywordMatcher(resume: string) {
  const vocabulary = new Set(tokens(resume).map(key));
  return (requirement: string): string[] => salientTerms(requirement).filter(term => vocabulary.has(key(term)));
}
