import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

// pdf.js needs browser-only APIs (DOMMatrix) at import time.
// TODO(phase 5): drop once file parsing is lazy-loaded.
vi.mock('pdfjs-dist', () => ({ GlobalWorkerOptions: {}, getDocument: vi.fn() }));
vi.mock('pdfjs-dist/build/pdf.worker.mjs?url', () => ({ default: '' }));

describe('App', () => {
  it('renders the optimizer without crashing when the backend is unreachable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'));

    render(<App />);

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(/tailor your resume/i);
    expect(screen.getByRole('button', { name: /analyze resume/i })).toBeDisabled();
  });
});
