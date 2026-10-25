import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

export type PreloadableComponent<P> = LazyExoticComponent<ComponentType<P>> & { preload: () => Promise<unknown> };

/** React.lazy plus a `preload()` that starts fetching the chunk early (e.g. on tab hover). */
export function lazyWithPreload<P>(factory: () => Promise<{ default: ComponentType<P> }>): PreloadableComponent<P> {
  let pending: Promise<{ default: ComponentType<P> }> | null = null;
  const load = () => (pending ??= factory());
  return Object.assign(lazy(load), { preload: load });
}
