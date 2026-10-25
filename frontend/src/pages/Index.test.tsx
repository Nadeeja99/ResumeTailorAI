import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '@/App';

const RESUME = 'Jane Doe — Senior Frontend Engineer with 6 years of React and TypeScript experience at fintech companies.';
const JD = 'We need a Senior Frontend Engineer skilled in React, TypeScript, Docker and Kubernetes.';

describe('Index tabs', () => {
  it('lazy-mounts a tool on first visit and keeps it mounted afterwards', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByLabelText('Resume'));
    await user.paste(RESUME);
    await user.click(screen.getByLabelText('Job description'));
    await user.paste(JD);

    // Not mounted before its first visit
    expect(screen.queryByRole('button', { name: 'Generate questions' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /interview prep/i }));
    const generate = await screen.findByRole('button', { name: 'Generate questions' });
    expect(generate).toBeVisible();

    // Switching away hides it but keeps it mounted (state and streams survive)
    await user.click(screen.getByRole('tab', { name: /optimizer/i }));
    const panel = screen.getByRole('button', { name: 'Generate questions', hidden: true }).closest('[role="tabpanel"]');
    expect(panel).toHaveAttribute('data-state', 'inactive'); // hidden via data-[state=inactive]:hidden

    await user.click(screen.getByRole('tab', { name: /interview prep/i }));
    expect(screen.getByRole('button', { name: 'Generate questions' })).toBe(generate);
  });
});
