// Small React helpers shared across the app.
import { useEffect, useRef, type DependencyList } from "react";

/** A ref that always holds the latest `value`, so an effect can call the newest callback without re-running. */
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}

/**
 * An effect for async work: `isCurrent()` turns false once the effect is cleaned up (unmount, or `deps` changed), so
 * a late result can be dropped instead of updating a screen that has moved on. The effect may return a cleanup too.
 */
export function useCancellableEffect(effect: (isCurrent: () => boolean) => void | (() => void), deps: DependencyList) {
  useEffect(() => {
    let current = true;
    const cleanup = effect(() => current);
    return () => {
      current = false;
      cleanup?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- callers' deps are checked via `additionalHooks`
  }, deps);
}
