import { describe, expect, it } from 'vitest';
import { redactContactDetails, restoreDeep, restoringStream } from './redaction';

const RESUME = `Alex Rivera
alex.rivera@example.com · +353 87 123 4567 · linkedin.com/in/alex-rivera · https://github.com/arivera.
Senior Engineer, 2019 - 2023 (2019.01-2023.06). Cut costs by 1,250,000 EUR. Portfolio: https://alex.dev`;

describe('redactContactDetails', () => {
  it('replaces contact details with typed placeholders and restores them', () => {
    const r = redactContactDetails(RESUME);
    expect(r.text).toContain('[EMAIL_1] · [PHONE_1] · [LINKEDIN_1] · [GITHUB_1].');
    expect(r.text).toContain('Portfolio: [URL_1]');
    expect(r.text).not.toMatch(/alex\.rivera@|123 4567|alex-rivera|arivera|alex\.dev/);
    expect(r.restore(r.text)).toBe(RESUME);
  });

  it('leaves dates, year ranges and amounts alone', () => {
    const r = redactContactDetails(RESUME);
    expect(r.text).toContain('2019 - 2023 (2019.01-2023.06)');
    expect(r.text).toContain('1,250,000 EUR');
    expect(redactContactDetails('Promoted 2015 2016 2017 for results').hasPlaceholders).toBe(false);
  });

  it('recognises common phone formats', () => {
    for (const phone of ['077 123 4567', '(01) 234 5678', '+94-77-123-4567', '0871234567']) {
      expect(redactContactDetails(`Phone: ${phone}`).text).toBe('Phone: [PHONE_1]');
    }
  });

  it('sends a resume without contact details unchanged', () => {
    const plain = 'Senior Engineer with 6 years of React and TypeScript at fintech companies.';
    const r = redactContactDetails(plain);
    expect(r.text).toBe(plain);
    expect(r.hasPlaceholders).toBe(false);
  });

  it('reuses one placeholder for a repeated value and keeps unknown ones as written', () => {
    const r = redactContactDetails('a@b.io and again a@b.io');
    expect(r.text).toBe('[EMAIL_1] and again [EMAIL_1]');
    expect(r.restore('Email [EMAIL_1], phone [PHONE_9]')).toBe('Email a@b.io, phone [PHONE_9]');
  });
});

describe('restoreDeep', () => {
  it('restores strings anywhere in a JSON result', () => {
    const r = redactContactDetails('Reach me at a@b.io');
    const result = restoreDeep({ score: 80, lines: ['[EMAIL_1]'], nested: { evidence: 'at [EMAIL_1]' } }, r.restore);
    expect(result).toEqual({ score: 80, lines: ['a@b.io'], nested: { evidence: 'at a@b.io' } });
  });
});

describe('restoringStream', () => {
  it('restores placeholders split across chunks', () => {
    const r = redactContactDetails('Reach me at a@b.io or 077 123 4567');
    const out: string[] = [];
    const stream = restoringStream(chunk => out.push(chunk), r);
    ['# Alex\n[EMA', 'IL_1] · [', 'PHONE_1]\n- Built [things]'].forEach(stream.onChunk);
    stream.flush();
    // Ordinary Markdown brackets still flow through
    expect(out.join('')).toBe('# Alex\na@b.io · 077 123 4567\n- Built [things]');
  });

  it('emits a held tail on flush', () => {
    const out: string[] = [];
    const stream = restoringStream(chunk => out.push(chunk), redactContactDetails('a@b.io'));
    stream.onChunk('Contact [EM');
    expect(out.join('')).toBe('Contact ');
    stream.flush();
    expect(out.join('')).toBe('Contact [EM');
  });

  it('passes chunks straight through when nothing was redacted', () => {
    const onChunk = (chunk: string) => chunk;
    expect(restoringStream(onChunk, redactContactDetails('no details here')).onChunk).toBe(onChunk);
  });
});
