import { describe, it, expect } from 'vitest';
import { cn, getErrorMessage } from './utils';

describe('getErrorMessage', () => {
  it('returns the message of an Error', () => {
    expect(getErrorMessage(new Error('boom'))).toBe('boom');
  });

  it('falls back for non-Error values and empty messages', () => {
    expect(getErrorMessage('boom', 'fallback')).toBe('fallback');
    expect(getErrorMessage(new Error(''), 'fallback')).toBe('fallback');
    expect(getErrorMessage(undefined)).toBe('Something went wrong.');
  });
});

describe('cn', () => {
  it('merges conflicting tailwind classes', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });
});
