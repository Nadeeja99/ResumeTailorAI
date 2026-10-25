import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- same constraint as React.lazy
type AnyComponent = ComponentType<any>;

export type PreloadableComponent<T extends AnyComponent> = LazyExoticComponent<T> & { preload: () => Promise<unknown> };

/** React.lazy plus a `preload()` that starts fetching the chunk early (e.g. on tab hover). */
export function lazyWithPreload<T extends AnyComponent>(factory: () => Promise<{ default: T }>): PreloadableComponent<T> {
  let pending: Promise<{ default: T }> | null = null;
  const load = () => (pending ??= factory());
  return Object.assign(lazy(load), { preload: load });
}
