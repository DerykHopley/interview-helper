import { useState } from "react";
import { generateUnlockKey } from "../vault/unlockKey";
import { AccessTokenPanel, describeActive, type Active } from "./AccessTokenPanel";

type Step = "token" | "key" | "start";

/** First-visit setup, the A2 checklist (docs/prototypes/access/README.md): numbered steps, each with a one-line
 * reason, one open at a time. The Access Token is held in memory until the Vault exists to keep it. */
export function Setup({ onComplete }: { onComplete: (unlockKey: string, accessToken: string | null) => Promise<void> }) {
  const [step, setStep] = useState<Step>("token");
  const [token, setToken] = useState<{ value: string; active: Active } | null>(null);
  const [unlockKey] = useState(generateUnlockKey);
  const [saved, setSaved] = useState(false);

  return (
    <section>
      <h2>Set up in three steps</h2>
      <p>Your stories stay in this browser. Two different things keep them safe and let you use AI.</p>
      <ol>
        <li>
          {step === "token" ? (
            <AccessTokenPanel
              onActive={(value, active) => { setToken({ value, active }); setStep("key"); }}
              onSkip={() => setStep("key")}
            />
          ) : (
            <>
              <h3>✓ Access Token</h3>
              <p>{token ? describeActive(token.active) : "Skipped — you can add it later."}</p>
            </>
          )}
        </li>
        <li>
          <h3>{step === "start" ? "✓ " : ""}Your Unlock Key</h3>
          <p>Made for you now. Locks your stories on this device. Never expires.</p>
          {step === "key" && (
            <>
              <p aria-label="Your Unlock Key">{unlockKey}</p>
              <p>
                <strong>We only show this once.</strong> If you lose it, your stories can't be recovered — not by us, not by
                anyone.
              </p>
              <label>
                <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
                I've saved my Unlock Key in a password manager or somewhere safe
              </label>
              <button type="button" disabled={!saved} onClick={() => setStep("start")}>
                Continue
              </button>
            </>
          )}
        </li>
        <li>
          <h3>Choose how to start</h3>
          <p>Your own stories, written by hand or with help.</p>
          {step === "start" && (
            <button type="button" onClick={() => void onComplete(unlockKey, token?.value ?? null)}>
              <strong>Start with my own stories</strong> Write your first Scenario, by hand or with help.
            </button>
          )}
        </li>
      </ol>
    </section>
  );
}
