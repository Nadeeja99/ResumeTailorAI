import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OriginalResume } from './OriginalResume';

// Canvas rendering needs a real browser (covered by Playwright); stub it here
vi.mock('./PdfPreview', () => ({ PdfPreview: ({ file }: { file: File }) => <div>pdf:{file.name}</div> }));

const TEXT = 'Jane Doe\n\nEXPERIENCE\n    Led the migration';
const file = new File(['%PDF'], 'resume.pdf', { type: 'application/pdf' });

describe('OriginalResume', () => {
  it('shows pasted text verbatim, preserving line breaks and indentation', () => {
    render(<OriginalResume text={TEXT} source={null} />);
    const pre = screen.getByText(/Jane Doe/);
    expect(pre.tagName).toBe('PRE');
    expect(pre.textContent).toBe(TEXT);
    expect(screen.queryByRole('button', { name: 'Original PDF' })).not.toBeInTheDocument();
  });

  it('shows the uploaded PDF, with a toggle to the text the AI reads', async () => {
    const user = userEvent.setup();
    render(<OriginalResume text={TEXT} source={{ file, text: TEXT }} />);

    expect(screen.getByText('pdf:resume.pdf')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'What the AI reads' }));
    expect(screen.getByText(/Led the migration/).textContent).toBe(TEXT);
    expect(screen.getByRole('button', { name: 'What the AI reads' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('falls back to the edited text once it no longer matches the PDF', () => {
    render(<OriginalResume text={`${TEXT} (edited)`} source={{ file, text: TEXT }} />);
    expect(screen.getByText(/no longer matches the uploaded PDF/)).toBeInTheDocument();
    expect(screen.queryByText('pdf:resume.pdf')).not.toBeInTheDocument();
  });
});
