import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  /** Short name of the area, used in the fallback heading (e.g. "Interview prep"). */
  label?: string;
  /** When any of these change, a tripped boundary resets automatically. */
  resetKeys?: unknown[];
}

interface State {
  error: Error | null;
}

/** Contains render errors to one area of the UI instead of blanking the whole app. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`[ErrorBoundary${this.props.label ? `: ${this.props.label}` : ''}]`, error, info.componentStack);
  }

  componentDidUpdate(prev: Props): void {
    const { resetKeys = [] } = this.props;
    const prevKeys = prev.resetKeys ?? [];
    if (this.state.error && resetKeys.some((key, i) => !Object.is(key, prevKeys[i]))) this.reset();
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div role="alert" className="flex flex-col items-center rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-12 text-center">
        <AlertTriangle className="mb-3 h-6 w-6 text-destructive" aria-hidden />
        <p className="text-sm font-medium">
          {this.props.label ? `${this.props.label} ran into a problem` : 'Something went wrong'}
        </p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          The rest of the app still works. Try again, or reload the page if this keeps happening.
        </p>
        {import.meta.env.DEV && (
          <pre className="mt-4 max-w-full overflow-x-auto rounded-md bg-muted px-3 py-2 text-left font-mono text-xs text-muted-foreground">
            {error.message}
          </pre>
        )}
        <Button variant="outline" size="sm" className="mt-6" onClick={this.reset}>
          <RotateCcw /> Try again
        </Button>
      </div>
    );
  }
}
