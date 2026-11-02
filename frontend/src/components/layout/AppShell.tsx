import type { ReactNode } from 'react';
import { Scissors } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

interface AppShellProps {
  children: ReactNode;
  /** Extra header controls rendered before the theme toggle (e.g. plan/usage). */
  actions?: ReactNode;
}

export function AppShell({ children, actions }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="container flex h-14 items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Scissors className="h-4 w-4" aria-hidden />
            </span>
            ResumeTailor
          </a>
          <div className="flex items-center gap-3">
            {actions}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container flex-1 py-10 sm:py-12">{children}</main>

      <footer className="border-t">
        <div className="container flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-4 text-xs text-muted-foreground">
          <span>ResumeTailor · AI resume tailoring · Powered by Gemini</span>
          {/* New tab, so following a link never discards a resume in progress */}
          <nav aria-label="Legal" className="flex gap-4">
            <a href="/privacy" target="_blank" rel="noreferrer" className="hover:text-foreground hover:underline">
              Privacy
            </a>
            <a href="/terms" target="_blank" rel="noreferrer" className="hover:text-foreground hover:underline">
              Terms
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
