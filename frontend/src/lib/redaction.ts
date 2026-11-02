// Tailoring a resume doesn't need the candidate's email, phone number or profile links, so they
// never leave the browser: each request swaps them for placeholders like [EMAIL_1] and the response
// swaps them back. A resume without contact details goes out byte-for-byte unchanged.

type Kind = 'EMAIL' | 'PHONE' | 'LINKEDIN' | 'GITHUB' | 'URL';

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
const URL = /\b(?:https?:\/\/|www\.)[^\s<>()[\]]+|\b(?:[\w-]+\.)?(?:linkedin|github|gitlab)\.com\/[^\s<>()[\]]+/gi;
const URL_TRAILING = /[.,;:!?'"]+$/;
// Digits with single separators and an optional +country code or (area) prefix; digit count and the
// date check below keep year ranges, dates and amounts out.
const PHONE = /(?<![\w+$€£.-])(?:\+\d{1,3}[ .-]?)?(?:\(\d{1,4}\)[ .-]?)?\d(?:[ .-]?\d){5,14}(?![\w-])/g;
const YEAR = /^(?:19|20)\d\d$/;
const PLACEHOLDER = /\[(?:EMAIL|PHONE|LINKEDIN|GITHUB|URL)_\d+\]/g;
// A stream chunk can end halfway through a placeholder ("…[PHO"); that tail waits for the next chunk.
const PARTIAL_PLACEHOLDER = /\[[A-Z_\d]{0,12}$/;

function isPhone(match: string): boolean {
  const groups = match.match(/\d+/g) ?? [];
  const digits = groups.join('').length;
  if (digits < 9 || digits > 15) return false;
  // 2019.01-2021.06, 2015 2016 2017: years plus short month/day groups
  const looksLikeDate = groups.some(g => YEAR.test(g)) && groups.every(g => YEAR.test(g) || g.length <= 2);
  return !looksLikeDate;
}

const urlKind = (url: string): Kind => (/linkedin\.com/i.test(url) ? 'LINKEDIN' : /github\.com/i.test(url) ? 'GITHUB' : 'URL');

export interface Redaction {
  text: string;
  /** Puts the original details back wherever the model kept a placeholder. */
  restore: (text: string) => string;
  hasPlaceholders: boolean;
}

export function redactContactDetails(source: string): Redaction {
  const tokens = new Map<string, string>(); // value → placeholder
  const values = new Map<string, string>(); // placeholder → value
  const counts: Partial<Record<Kind, number>> = {};

  const placeholder = (kind: Kind, value: string) => {
    let token = tokens.get(value);
    if (!token) {
      counts[kind] = (counts[kind] ?? 0) + 1;
      token = `[${kind}_${counts[kind]}]`;
      tokens.set(value, token);
      values.set(token, value);
    }
    return token;
  };

  // Emails first so their domains aren't read as URLs, phones last so URL digits are already gone
  const text = source
    .replace(EMAIL, email => placeholder('EMAIL', email))
    .replace(URL, match => {
      const trailing = match.match(URL_TRAILING)?.[0] ?? '';
      const url = match.slice(0, match.length - trailing.length);
      return placeholder(urlKind(url), url) + trailing;
    })
    .replace(PHONE, match => (isPhone(match) ? placeholder('PHONE', match) : match));

  const restore = (value: string) => (values.size ? value.replace(PLACEHOLDER, token => values.get(token) ?? token) : value);
  return { text, restore, hasPlaceholders: values.size > 0 };
}

/** Restores every string inside a JSON result (analysis lists, semantic evidence, interview answers…). */
export function restoreDeep<T>(value: T, restore: (text: string) => string): T {
  if (typeof value === 'string') return restore(value) as T;
  if (Array.isArray(value)) return value.map(item => restoreDeep(item, restore)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, restoreDeep(item, restore)])) as T;
  }
  return value;
}

/** Wraps a stream's onChunk so placeholders are restored even when split across chunks. */
export function restoringStream(onChunk: (chunk: string) => void, redaction: Redaction) {
  if (!redaction.hasPlaceholders) return { onChunk, flush: () => {} };
  let held = '';
  return {
    onChunk(chunk: string) {
      const text = held + chunk;
      held = text.match(PARTIAL_PLACEHOLDER)?.[0] ?? '';
      const ready = text.slice(0, text.length - held.length);
      if (ready) onChunk(redaction.restore(ready));
    },
    /** Emits a held tail, e.g. when the stream fails mid-placeholder. */
    flush() {
      if (held) onChunk(redaction.restore(held));
      held = '';
    },
  };
}
