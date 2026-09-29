import { useMemo, useState } from "react";
import { useCancellableEffect } from "../hooks";
import type { UnlockedVault } from "../vault/vault";
import { AccessTokenPanel, type Active } from "./AccessTokenPanel";
import { keptAccessToken } from "./keptAccessToken";

/** "6h left", or in days once it's two days or more. */
function timeLeft(expiresAt: Date, now = Date.now()) {
  const hours = Math.floor((expiresAt.getTime() - now) / 3_600_000);
  if (hours < 1) return "<1h left";
  return hours < 48 ? `${hours}h left` : `${Math.floor(hours / 24)}d left`;
}

/** The dashboard's Access chip (D2 design): the kept Access Token's status, opening a panel to check or replace it.
 * The panel stays mounted while closed, so the token is recalled and checked again as soon as the app unlocks. */
export function AccessChip({ vault }: { vault: UnlockedVault }) {
  const kept = useMemo(() => keptAccessToken(vault), [vault]);
  const [remembered, setRemembered] = useState<string | null | undefined>(undefined); // undefined while reading
  const [active, setActive] = useState<Active | null>(null);
  const [open, setOpen] = useState(false);

  useCancellableEffect(
    (isCurrent) => {
      void kept.recall().then((token) => {
        if (isCurrent()) setRemembered(token);
      });
    },
    [kept],
  );

  return (
    <div className="access-chip">
      <button
        type="button"
        className={`chip ${active ? "is-ok" : "is-warn"}`}
        aria-expanded={open}
        aria-controls="access-panel"
        onClick={() => setOpen((o) => !o)}
      >
        Access · {active ? timeLeft(active.expiresAt) : "none"}
      </button>
      <div id="access-panel" className="card access-panel" hidden={!open}>
        <h2 className="card-title">Access Token</h2>
        <p className="card-why">From your teacher or group. Lets the app use AI for a limited time.</p>
        {remembered !== undefined && (
          <AccessTokenPanel
            remembered={remembered ?? undefined}
            onActive={(token, status) => {
              setActive(status);
              void kept.keep(token);
            }}
            onForget={() => {
              setActive(null);
              void kept.forget();
            }}
            onMessage={(message) => message && setOpen(true)}
          />
        )}
      </div>
    </div>
  );
}
