import type { ReactNode } from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

// Also read by the pre-paint script in index.html — keep both in sync.
export const THEME_STORAGE_KEY = 'rt-theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey={THEME_STORAGE_KEY}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
