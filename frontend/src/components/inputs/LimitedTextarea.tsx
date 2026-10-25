import { Textarea } from '@/components/ui/textarea';
import { lengthError, type LengthRule } from '@/lib/limits';
import { cn } from '@/lib/utils';

interface LimitedTextareaProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  rule: LengthRule;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  className?: string;
}

/** Textarea with a live character count and inline validation mirroring the backend limits. */
export function LimitedTextarea({ id, label, value, onChange, rule, className, ...props }: LimitedTextareaProps) {
  const error = lengthError(label, value, rule);
  const metaId = `${id}-meta`;

  return (
    <div className="space-y-1.5">
      <Textarea
        id={id}
        aria-label={label}
        aria-invalid={Boolean(error)}
        aria-describedby={metaId}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={cn('resize-y leading-relaxed', error && 'border-destructive focus-visible:ring-destructive', className)}
        {...props}
      />
      <div id={metaId} className="flex items-start justify-between gap-4 text-xs">
        <span aria-live="polite" className="text-destructive">
          {error}
        </span>
        <span className={cn('shrink-0 tabular-nums text-muted-foreground', value.length > rule.max && 'text-destructive')}>
          {value.length.toLocaleString()} / {rule.max.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
