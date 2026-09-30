import { useEffect, useMemo, useState } from "react";
import { useCancellableEffect, useLatest } from "../hooks";
import type { UnlockedVault } from "../vault/vault";
import { AccessTokenPanel, type Active, type CheckResult } from "./AccessTokenPanel";
import { keptAccessToken } from "./keptAccessToken";

/** Keeping or forgetting the token fails only if the Vault has gone (locked, or the page closed) meanwhile. Then
 * there's nothing to update: the token is simply asked for again after the next unlock. */
const ignoreClosedVault = () => {};

/** The longest a browser timer can wait: about 24.8 days. */
const MAX_TIMER_MS = 2 ** 31 - 1;

/** "6h left", or in days once it's two days or more. */
function timeLeft(expiresAt: Date, now = Date.now()) {
  const hours = Math.floor((expiresAt.getTime() - now) / 3_600_000);
  if (hours < 1) return "<1h left";
  return hours < 48 ? `${hours}h left` : `${Math.floor(hours / 24)}d left`;
}

/** The dashboard's Access chip (D2 design): the kept Access Token's status, opening a panel to check or replace it.
 * The panel stays mounted while closed, so the token is recalled and checked again as soon as the app unlocks. */
export function AccessChip({
  vault,
  openRequests = 0,
  expiredReports = 0,
  onActiveChange,
}: {
  vault: UnlockedVault;
  /** Each increase opens the panel. */
  openRequests?: number;
  /** Each increase says a model call found the token expired, so it's no longer shown as active. */
  expiredReports?: number;
  /** Told whether an Access Token is active, e.g. so the app can offer to write Questions. */
  onActiveChange?: (active: boolean) => void;
}) {
  const kept = useMemo(() => keptAccessToken(vault), [vault]);
  const [remembered, setRemembered] = useState<string | null | undefined>(undefined); // undefined while reading
  const [active, setActive] = useState<Active | null>(null);
  const [lastCheck, setLastCheck] = useState<CheckResult | null>(null);
  const [open, setOpen] = useState(false);
  const latestOnActiveChange = useLatest(onActiveChange);
  useEffect(() => latestOnActiveChange.current?.(active !== null), [active, latestOnActiveChange]);
  const expire = () => {
    setActive(null);
    setLastCheck("expired");
  };
  // A model call found the token expired: adjusting state while rendering, as for openRequests.
  const [seenExpiredReports, setSeenExpiredReports] = useState(expiredReports);
  if (expiredReports !== seenExpiredReports) {
    setSeenExpiredReports(expiredReports);
    expire();
  }
  // The token's time is up. (Tokens last at most 7 days; a timer can't wait longer than MAX_TIMER_MS, and one asked to
  // would fire at once, so none is set then.)
  useEffect(() => {
    const left = active ? active.expiresAt.getTime() - Date.now() : null;
    if (left === null || left > MAX_TIMER_MS) return;
    const timer = setTimeout(expire, Math.max(0, left));
    return () => clearTimeout(timer);
  }, [active]);
  // A new request to open (e.g. "Enter a new token") opens the panel; adjusting state while rendering, React's way.
  const [seenRequests, setSeenRequests] = useState(openRequests);
  if (openRequests !== seenRequests) {
    setSeenRequests(openRequests);
    setOpen(true);
  }

  useCancellableEffect(
    (isCurrent) => {
      kept.recall().then(
        (token) => isCurrent() && setRemembered(token),
        () => isCurrent() && setRemembered(null), // unreadable: ask for a token again
      );
    },
    [kept],
  );

  /** What the chip says: a kept token is "checking…" until the Worker answers, and "not checked" if it can't. */
  function status() {
    if (active) return timeLeft(active.expiresAt);
    if (remembered === undefined || (remembered && lastCheck === null)) return "checking…";
    if (remembered && lastCheck === "unreachable") return "not checked";
    if (lastCheck === "expired") return "expired";
    return "none";
  }

  return (
    <div className="access-chip">
      <button
        type="button"
        className={`chip ${active ? "is-ok" : "is-warn"}`}
        aria-expanded={open}
        aria-controls="access-panel"
        onClick={() => setOpen((o) => !o)}
      >
        Access · {status()}
      </button>
      <div id="access-panel" className="card access-panel" hidden={!open}>
        <h2 className="card-title">Access Token</h2>
        <p className="card-why">From your teacher or group. Lets the app use AI for a limited time.</p>
        {remembered !== undefined && (
          <AccessTokenPanel
            remembered={remembered ?? undefined}
            onActive={(token, status) => {
              setActive(status);
              if (token !== remembered) void kept.keep(token).catch(ignoreClosedVault); // a confirmed kept token is already stored
            }}
            onForget={() => {
              setActive(null);
              setRemembered(null);
              void kept.forget().catch(ignoreClosedVault);
            }}
            onChecked={(result) => {
              setLastCheck(result);
              if (result !== "active") setOpen(true); // so the Candidate sees why
            }}
          />
        )}
      </div>
    </div>
  );
}
