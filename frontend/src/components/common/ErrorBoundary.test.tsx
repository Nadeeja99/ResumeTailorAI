import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from './ErrorBoundary';

function Bomb({ explode }: { explode: boolean }) {
  if (explode) throw new Error('kaboom');
  return <p>All good</p>;
}

describe('ErrorBoundary', () => {
  it('contains a render error and recovers on "Try again"', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();

    function Harness() {
      const [explode, setExplode] = useState(true);
      return (
        <>
          <button onClick={() => setExplode(false)}>fix</button>
          <ErrorBoundary label="Interview prep">
            <Bomb explode={explode} />
          </ErrorBoundary>
          <p>Sibling still rendered</p>
        </>
      );
    }
    render(<Harness />);

    expect(screen.getByRole('alert')).toHaveTextContent('Interview prep ran into a problem');
    expect(screen.getByText('kaboom')).toBeInTheDocument(); // dev-only details
    expect(screen.getByText('Sibling still rendered')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'fix' }));
    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(screen.getByText('All good')).toBeInTheDocument();
  });
});
