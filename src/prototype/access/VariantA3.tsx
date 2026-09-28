// PROTOTYPE — Variant A3: keyring. The two secrets are two objects on the table — a ticket (Access Token) and a
// key (Unlock Key) — each showing its own state. Tap one to open its panel. There's no wizard and no separate home:
// the same table is where you set up, unlock, see the token expire and lock again.
import { useEffect, useState } from "react";
import { hoursLeft, type Access } from "./access";
import { KeyReveal, StartOverForm, TokenForm, UnlockForm } from "./Forms";

type Panel = "token" | "key" | null;

export function VariantA3({ access }: { access: Access }) {
  // ?step=token|key and ?lost=1 open a given panel (for screenshots)
  const [panel, setPanel] = useState<Panel>(() => new URLSearchParams(location.search).get("step") as Panel);
  const [confirmed, setConfirmed] = useState(false);
  const [keySaved, setKeySaved] = useState(false);
  const [withDemo, setWithDemo] = useState(false);
  const [lost, setLost] = useState(() => new URLSearchParams(location.search).has("lost"));
  const { stage, token, tokenExpired } = access;

  const keyState = stage === "unlocked" ? "unlocked" : stage === "locked" ? "locked" : keySaved ? "saved" : "new";
  const keyText = { new: "New key — tap to see it", saved: "Saved ✓", locked: "Locked — tap to unlock", unlocked: "Unlocked · locks after 15 min idle" }[keyState];
  const ticketText = token ? `${token.label} · ${hoursLeft(token)}h left` : tokenExpired ? "Expired — tap for a new one" : "None yet — tap to add";

  const close = () => { setPanel(null); setLost(false); };
  useEffect(() => { if (stage === "unlocked") close(); }, [stage]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="a3">
      <div className="a3-brand">Interview Helper</div>
      <div className="a3-headline">
        {stage === "first-visit" && "Two things to set up. The ticket is optional; the key is yours."}
        {stage === "locked" && "Welcome back. Tap your key to unlock."}
        {stage === "unlocked" && "You're in."}
      </div>

      <div className="a3-objects">
        <button className={`a3-ticket ${token ? "is-ok" : ""} ${tokenExpired ? "is-expired" : ""}`} onClick={() => setPanel("token")}>
          <span className="a3-obj-label">Access Token</span>
          <svg className="a3-ticket-mark" viewBox="0 0 48 30" width="64" height="40" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round">
            <path d="M3 5h42v7a3 3 0 0 0 0 6v7H3v-7a3 3 0 0 0 0-6z" /><path d="M32 5v20" strokeDasharray="3 3" />
          </svg>
          <span className="a3-obj-state">{ticketText}</span>
          <span className="a3-obj-why">Lets the app use AI</span>
          {tokenExpired && <span className="a3-stamp">EXPIRED</span>}
        </button>
        <button className={`a3-key is-${keyState}`} onClick={() => keyState !== "unlocked" && setPanel("key")}>
          <span className="a3-obj-label">Unlock Key</span>
          <svg className="a3-key-mark" viewBox="0 0 48 24" width="72" height="36" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="10" cy="12" r="7" /><path d="M17 12h28M38 12v6M44 12v4" />
          </svg>
          <span className="a3-obj-state">{keyText}</span>
          <span className="a3-obj-why">Locks your stories on this device</span>
        </button>
      </div>

      <div className="a3-go">
        {stage === "first-visit" && (
          <>
            <label className="ac-check a3-demo">
              <input type="checkbox" checked={withDemo} onChange={(e) => setWithDemo(e.target.checked)} /> Add demo stories to try matching (labelled demo)
            </label>
            <button className="ac-primary" disabled={!keySaved} onClick={() => access.finishSetup(withDemo)}>Open my stories</button>
            {!keySaved && <div className="a3-hint">Save your Unlock Key first</div>}
          </>
        )}
        {stage === "unlocked" && (
          <>
            <a className="ac-primary" href="/?variant=K1">Go to your Interviews →</a>
            <button className="ac-link" onClick={access.lock}>🔒 Lock now</button>
          </>
        )}
      </div>

      {panel && (
        <>
          <div className="a3-scrim" onClick={close} />
          <div className={`a3-panel ${lost ? "is-danger" : ""}`}>
            <button className="a3-close" onClick={close} aria-label="Close">×</button>
            {panel === "token" && (
              <>
                <h2 className="a3-panel-h">{token ? "Replace your Access Token" : "Add your Access Token"}</h2>
                <p className="a3-panel-p">Your teacher or group organiser gives you this. It lasts 8 hours. Without it, your stories still work — only AI features stop.</p>
                <TokenForm access={access} onDone={close} onSkip={stage === "first-visit" ? close : undefined} />
              </>
            )}
            {panel === "key" && stage === "first-visit" && (
              <>
                <h2 className="a3-panel-h">Your Unlock Key</h2>
                <KeyReveal access={access} confirmed={confirmed} setConfirmed={setConfirmed} />
                <button className="ac-primary" disabled={!confirmed} onClick={() => { setKeySaved(true); close(); }}>Done</button>
              </>
            )}
            {panel === "key" && stage === "locked" && (
              lost ? (
                <>
                  <h2 className="a3-panel-h">Start over without your key?</h2>
                  <StartOverForm access={access} onCancel={() => setLost(false)} />
                </>
              ) : (
                <>
                  <h2 className="a3-panel-h">Unlock</h2>
                  <p className="a3-panel-p">Paste your Unlock Key to open your stories.</p>
                  <UnlockForm access={access} onLost={() => setLost(true)} />
                </>
              )
            )}
          </div>
        </>
      )}
    </div>
  );
}
