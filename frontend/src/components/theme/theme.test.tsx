import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@/components/ui/tooltip';
import { media } from '@/test/setup';
import { THEME_STORAGE_KEY, ThemeProvider } from './ThemeProvider';
import { ThemeToggle } from './ThemeToggle';

function renderToggle() {
  return render(
    <ThemeProvider>
      <TooltipProvider>
        <ThemeToggle />
      </TooltipProvider>
    </ThemeProvider>
  );
}

const html = document.documentElement;

describe('ThemeToggle', () => {
  it('defaults to the system preference', () => {
    media.prefersDark = true;
    renderToggle();

    expect(screen.getByRole('radio', { name: /system theme/i })).toHaveAttribute('aria-checked', 'true');
    expect(html).toHaveClass('dark');
  });

  it('applies and persists an explicit choice', async () => {
    const user = userEvent.setup();
    renderToggle();

    await user.click(screen.getByRole('radio', { name: /dark theme/i }));
    expect(html).toHaveClass('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');

    await user.click(screen.getByRole('radio', { name: /light theme/i }));
    expect(html).not.toHaveClass('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    expect(screen.getByRole('radio', { name: /light theme/i })).toHaveAttribute('aria-checked', 'true');
  });

  it('restores the saved choice on the next visit', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    renderToggle();

    expect(screen.getByRole('radio', { name: /dark theme/i })).toHaveAttribute('aria-checked', 'true');
    expect(html).toHaveClass('dark');
  });
});

describe('pre-paint theme script (index.html)', () => {
  const page = readFileSync(resolve(__dirname, '../../../index.html'), 'utf8');
  const script = page.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? '';
  const runScript = () => new Function(script)();

  it('uses the same storage key as the provider', () => {
    expect(script).toContain(`'${THEME_STORAGE_KEY}'`);
  });

  it.each([
    { stored: 'dark', prefersDark: false, dark: true },
    { stored: 'light', prefersDark: true, dark: false },
    { stored: 'system', prefersDark: true, dark: true },
    { stored: null, prefersDark: true, dark: true },
    { stored: null, prefersDark: false, dark: false },
  ])('stored=$stored, OS dark=$prefersDark → dark=$dark', ({ stored, prefersDark, dark }) => {
    if (stored) localStorage.setItem(THEME_STORAGE_KEY, stored);
    media.prefersDark = prefersDark;

    runScript();

    expect(html.classList.contains('dark')).toBe(dark);
  });
});
