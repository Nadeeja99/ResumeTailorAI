import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { CodeBlock } from './CodeBlock';

export interface MarkdownRendererProps {
  content: string;
  /** `paper` keeps print colors for the white document preview. */
  variant?: 'app' | 'paper';
  className?: string;
}

// Minimal hast shape — enough to pull a fenced block's language and text.
interface HastNode {
  type: string;
  value?: string;
  tagName?: string;
  properties?: { className?: unknown };
  children?: HastNode[];
}

const textOf = (node: HastNode): string =>
  node.type === 'text' ? node.value ?? '' : (node.children ?? []).map(textOf).join('');

function languageOf(node: HastNode): string | undefined {
  const classes = node.properties?.className;
  const match = Array.isArray(classes) ? classes.find(c => String(c).startsWith('language-')) : undefined;
  return match ? String(match).slice('language-'.length) : undefined;
}

function components(paper: boolean): Components {
  return {
    // Fenced blocks arrive as <pre><code>; render them as a highlighted, copyable block
    pre({ node }) {
      const code = (node as unknown as HastNode | undefined)?.children?.find(c => c.tagName === 'code');
      if (!code) return null;
      return <CodeBlock code={textOf(code).replace(/\n$/, '')} language={languageOf(code)} forceLight={paper} />;
    },
    code({ children }) {
      return <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em] before:content-none after:content-none">{children}</code>;
    },
    a({ href, children }) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      );
    },
  };
}

/**
 * Safe Markdown → React: raw HTML is never rendered (react-markdown escapes it and
 * strips `javascript:` URLs). Supports GFM tables, task lists and fenced code.
 */
export default function MarkdownRenderer({ content, variant = 'app', className }: MarkdownRendererProps) {
  const paper = variant === 'paper';
  return (
    <div
      className={cn(
        'prose prose-sm max-w-none prose-zinc prose-headings:tracking-tight prose-a:text-primary',
        paper
          ? 'text-zinc-800 prose-headings:text-zinc-900 prose-h1:mb-1 prose-h1:text-2xl prose-h2:mb-2 prose-h2:mt-6 prose-h2:border-b prose-h2:border-zinc-200 prose-h2:pb-1 prose-h2:text-sm prose-h2:uppercase prose-h2:tracking-wide prose-li:my-0.5 prose-ul:my-2'
          : 'dark:prose-invert',
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components(paper)}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
