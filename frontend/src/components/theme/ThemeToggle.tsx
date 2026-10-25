import { useTheme } from 'next-themes';
import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const OPTIONS: { value: string; label: string; icon: LucideIcon }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export function ThemeToggle() {
  const { theme = 'system', setTheme } = useTheme();

  return (
    <div role="radiogroup" aria-label="Color theme" className="inline-flex items-center rounded-md border bg-background p-0.5">
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <Tooltip key={value}>
          <TooltipTrigger asChild>
            <button
              type="button"
              role="radio"
              aria-checked={theme === value}
              aria-label={`${label} theme`}
              onClick={() => setTheme(value)}
              className={cn(
                'inline-flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground transition-colors',
                'hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                theme === value && 'bg-secondary text-foreground'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
