import { Highlight, themes } from 'prism-react-renderer';
import { useTheme } from 'next-themes';
import { CopyButton } from '@/components/common/CopyButton';
import { cn } from '@/lib/utils';

interface CodeBlockProps {
  code: string;
  language?: string;
  /** Force light colors (e.g. inside the white "paper" preview). */
  forceLight?: boolean;
}

export function CodeBlock({ code, language = 'text', forceLight = false }: CodeBlockProps) {
  const { resolvedTheme } = useTheme();
  const dark = !forceLight && resolvedTheme === 'dark';

  return (
    <div className="not-prose my-4 overflow-hidden rounded-md border">
      <div className="flex items-center justify-between border-b bg-muted/50 px-3 py-1">
        <span className="font-mono text-xs text-muted-foreground">{language}</span>
        <CopyButton value={code} label="Copy code" />
      </div>
      <Highlight code={code} language={language} theme={dark ? themes.vsDark : themes.github}>
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre className={cn(className, 'overflow-x-auto p-4 font-mono text-[13px] leading-relaxed')} style={style}>
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line })}>
                {line.map((token, j) => (
                  <span key={j} {...getTokenProps({ token })} />
                ))}
              </div>
            ))}
          </pre>
        )}
      </Highlight>
    </div>
  );
}
