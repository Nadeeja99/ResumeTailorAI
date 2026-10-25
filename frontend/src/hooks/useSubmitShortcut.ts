import { useCallback, type KeyboardEvent } from 'react';

export const isMac =
  typeof navigator !== 'undefined' && /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent);

export const SUBMIT_SHORTCUT_LABEL = isMac ? '⌘ ↵' : 'Ctrl ↵';

/**
 * Returns an onKeyDown handler that calls `onSubmit` on ⌘/Ctrl + Enter.
 * Attach it to a container — key events bubble up from any input inside.
 */
export function useSubmitShortcut(onSubmit: () => void, enabled = true) {
  return useCallback(
    (event: KeyboardEvent) => {
      if (!enabled || event.key !== 'Enter' || !(event.metaKey || event.ctrlKey) || event.nativeEvent.isComposing) return;
      event.preventDefault();
      onSubmit();
    },
    [onSubmit, enabled]
  );
}
