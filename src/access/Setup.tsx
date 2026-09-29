import { useState } from "react";
import { generateUnlockKey } from "../vault/unlockKey";
import { AccessTokenPanel, describeActive, type Active } from "./AccessTokenPanel";
import { ChecklistStep } from "./ChecklistStep";

const STEPS = ["token", "key", "start"] as const;
type Step = (typeof STEPS)[number];

/** First-visit setup, the A2 checklist: Access Token → Unlock Key → how to start. The Access Token is held here, in
 * memory, until the Vault exists to keep it. */
export function Setup({ onComplete }: { onComplete: (unlockKey: string, accessToken: string | null) => Promise<void> }) {
  const [step, setStep] = useState<Step>("token");
  const [token, setToken] = useState<{ value: string; active: Active } | null>(null);
  const [unlockKey] = useState(generateUnlockKey);
  const [starting, setStarting] = useState(false);
  const stateOf = (s: Step) => (STEPS.indexOf(s) < STEPS.indexOf(step) ? "done" : s === step ? "current" : "upcoming");

  async function start() {
    setStarting(true); // creating the Vault twice would give it two different keys
    await onComplete(unlockKey, token?.value ?? null);
  }

  return (
    <section>
      <h2>Set up in three steps</h2>
      <p>Your Scenarios stay in this browser. Two different things keep them safe and let you use AI.</p>
      <ol>
        <ChecklistStep
          n={1}
          title="Access Token"
          why="From your teacher or group. Lets the app use AI for a limited time."
          state={stateOf("token")}
          summary={token ? describeActive(token.active) : "skipped — you can add it later"}
        >
          <AccessTokenPanel
            onActive={(value, active) => { setToken({ value, active }); setStep("key"); }}
            onSkip={() => setStep("key")}
          />
        </ChecklistStep>
        <ChecklistStep n={2} title="Your Unlock Key" why="Made for you now. Locks your Scenarios on this device. Never expires." state={stateOf("key")} summary="saved">
          <UnlockKeyReveal unlockKey={unlockKey} onSaved={() => setStep("start")} />
        </ChecklistStep>
        <ChecklistStep n={3} title="Choose how to start" why="Your own Scenarios, written by hand or with help." state={stateOf("start")}>
          <button type="button" disabled={starting} onClick={() => void start()}>
            <strong>Start with my own Scenarios</strong> Write your first Scenario, by hand or with help.
          </button>
        </ChecklistStep>
      </ol>
    </section>
  );
}

function UnlockKeyReveal({ unlockKey, onSaved }: { unlockKey: string; onSaved: () => void }) {
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const download = `data:text/plain;charset=utf-8,${encodeURIComponent(`Interview Helper Unlock Key: ${unlockKey}\n`)}`;

  return (
    <>
      <p aria-label="Your Unlock Key">{unlockKey}</p>
      <button type="button" onClick={() => void navigator.clipboard.writeText(unlockKey).then(() => setCopied(true))}>
        {copied ? "✓ Copied" : "Copy"}
      </button>
      <a href={download} download="interview-helper-unlock-key.txt">
        Download .txt
      </a>
      <p>
        <strong>We only show this once.</strong> If you lose it, your Scenarios can't be recovered — not by us, not by
        anyone.
      </p>
      <label>
        <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
        I've saved my Unlock Key in a password manager or somewhere safe
      </label>
      <button type="button" disabled={!saved} onClick={onSaved}>
        Continue
      </button>
    </>
  );
}
