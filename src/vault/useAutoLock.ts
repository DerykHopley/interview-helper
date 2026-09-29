import { useEffect, useRef } from "react";

export const AUTO_LOCK_AFTER_MS = 15 * 60_000;
const ACTIVITY = ["pointerdown", "keydown", "wheel", "touchstart"] as const;

/** Calls `lock` after 15 minutes without the Candidate touching, typing or scrolling (spec #1, story 17). */
export function useAutoLock(lock: () => void) {
  // The latest `lock`, so re-rendering doesn't restart the 15 minutes; only activity does.
  const latest = useRef(lock);
  useEffect(() => {
    latest.current = lock;
  });

  useEffect(() => {
    const fire = () => latest.current();
    let timer = setTimeout(fire, AUTO_LOCK_AFTER_MS);
    const restart = () => {
      clearTimeout(timer);
      timer = setTimeout(fire, AUTO_LOCK_AFTER_MS);
    };
    for (const event of ACTIVITY) document.addEventListener(event, restart, { capture: true, passive: true });
    return () => {
      clearTimeout(timer);
      for (const event of ACTIVITY) document.removeEventListener(event, restart, { capture: true });
    };
  }, []);
}
