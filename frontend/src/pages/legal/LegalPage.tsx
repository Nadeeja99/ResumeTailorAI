import { useEffect, type ReactNode } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { SITE } from '@/lib/site';

interface LegalPageProps {
  title: string;
  children: ReactNode;
}

export function LegalPage({ title, children }: LegalPageProps) {
  useEffect(() => {
    const previous = document.title;
    document.title = `${title} · ${SITE.name}`;
    return () => {
      document.title = previous;
    };
  }, [title]);

  return (
    <AppShell>
      <article className="prose prose-sm mx-auto max-w-3xl prose-zinc dark:prose-invert prose-headings:tracking-tight prose-h2:mt-10 prose-a:text-primary sm:prose-base">
        <h1>{title}</h1>
        <p className="text-muted-foreground">Last updated {SITE.legalUpdated}</p>
        {children}
      </article>
    </AppShell>
  );
}

export const ContactEmail = () => <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>;
