import { useEffect } from "react";
import { useLatest } from "../hooks";

const AUTO_LOCK_AFTER_MS = 15 * 60_000;
const ACTIVITY = ["pointerdown", "keydown", "wheel", "touchstart"] as const;

/**
 * Calls `lock` after 15 minutes without the Candidate touching, typing or scrolling (spec #1, story 17). Browsers
 * pause or delay timers while a device sleeps or a tab is in the background, so coming back also checks the clock.
 */
export function useAutoLock(lock: () => void) {
  // The latest `lock`, so re-rendering doesn't restart the 15 minutes; only activity does.
  const latest = useLatest(lock);

  useEffect(() => {
    const fire = () => latest.current();
    let lastActivity = Date.now();
    let timer = setTimeout(fire, AUTO_LOCK_AFTER_MS);
    const overdue = () => Date.now() - lastActivity >= AUTO_LOCK_AFTER_MS;
    const restart = () => {
      if (overdue()) return fire(); // activity after a long sleep doesn't count
      lastActivity = Date.now();
      clearTimeout(timer);
      timer = setTimeout(fire, AUTO_LOCK_AFTER_MS);
    };
    const checkClock = () => {
      if (overdue()) fire();
    };
    for (const event of ACTIVITY) document.addEventListener(event, restart, { capture: true, passive: true });
    document.addEventListener("visibilitychange", checkClock);
    window.addEventListener("focus", checkClock);
    return () => {
      clearTimeout(timer);
      for (const event of ACTIVITY) document.removeEventListener(event, restart, { capture: true });
      document.removeEventListener("visibilitychange", checkClock);
      window.removeEventListener("focus", checkClock);
    };
  }, [latest]);
}
