import { lazy, Suspense } from 'react';
import type { MarkdownRendererProps } from './MarkdownRenderer';

// react-markdown + Prism load on first use, keeping them out of the initial bundle.
const MarkdownRenderer = lazy(() => import('./MarkdownRenderer'));

export function Markdown(props: MarkdownRendererProps) {
  return (
    <Suspense fallback={<div className="whitespace-pre-wrap text-sm leading-relaxed">{props.content}</div>}>
      <MarkdownRenderer {...props} />
    </Suspense>
  );
}
