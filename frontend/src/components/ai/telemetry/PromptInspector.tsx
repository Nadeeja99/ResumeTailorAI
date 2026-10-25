import { ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CopyButton } from '@/components/common/CopyButton';
import type { PromptRecord } from '@/types/ai';

function PromptBlock({ role, text }: { role: string; text: string }) {
  return (
    <div className="overflow-hidden rounded-md border">
      <div className="flex items-center justify-between border-b bg-muted/50 px-3 py-1">
        <span className="font-mono text-xs text-muted-foreground">{role}</span>
        <CopyButton value={text} label="Copy" />
      </div>
      <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words p-3 font-mono text-xs leading-relaxed">{text}</pre>
    </div>
  );
}

/** Raw prompts sent to the model, one collapsible entry per call (schema repairs included). */
export function PromptInspector({ prompts }: { prompts?: PromptRecord[] }) {
  if (!prompts?.length) {
    return (
      <p className="text-xs text-muted-foreground">
        Raw prompts are hidden by the server (<code className="font-mono">EXPOSE_PROMPTS=false</code>).
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Prompts</h4>
      {prompts.map((p, i) => (
        <Collapsible key={i}>
          <CollapsibleTrigger className="group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" aria-hidden />
            Call {i + 1}
            <span className="ml-auto font-mono text-xs text-muted-foreground">
              {((p.system?.length ?? 0) + p.user.length).toLocaleString()} chars
            </span>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 px-2 pb-2 pt-1">
            {p.system && <PromptBlock role="system" text={p.system} />}
            <PromptBlock role="user" text={p.user} />
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
}
