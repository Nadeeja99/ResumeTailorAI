import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// jsdom has no matchMedia; tests flip `media.prefersDark` to simulate the OS theme.
export const media = { prefersDark: false };

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: query.includes('prefers-color-scheme: dark') ? media.prefersDark : false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// jsdom doesn't implement layout/scrolling APIs
Element.prototype.scrollIntoView ??= () => {};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
  document.documentElement.className = '';
  document.documentElement.removeAttribute('style');
  media.prefersDark = false;
});
