import { useState } from "react";
import type { Pack } from "../packs/packFormat";
import { SHIPPED_PACKS } from "../packs/shippedPacks";
import { generateUnlockKey } from "../vault/unlockKey";
import { AccessTokenPanel, type Active } from "./AccessTokenPanel";
import { ChecklistStep } from "./ChecklistStep";

const STEPS = ["token", "key", "start"] as const;
type Step = (typeof STEPS)[number];

/** First-visit setup, the A2 checklist: Access Token → Unlock Key → how to start. The Access Token is held here, in
 * memory, until the Vault exists to keep it. */
/** What setup collected: the new Unlock Key, the Access Token if one was entered, and the Pack to start from, if any. */
export type SetupChoices = { unlockKey: string; accessToken: string | null; pack: Pack | null };

export function Setup({ onComplete }: { onComplete: (choices: SetupChoices) => Promise<void> }) {
  const [step, setStep] = useState<Step>("token");
  const [token, setToken] = useState<{ value: string; active: Active } | null>(null);
  const [unlockKey] = useState(generateUnlockKey);
  const [starting, setStarting] = useState(false);
  const [failed, setFailed] = useState(false);
  const stateOf = (s: Step) => (STEPS.indexOf(s) < STEPS.indexOf(step) ? "done" : s === step ? "current" : "upcoming");

  /** Creates the Vault, then opens the app: on a new Interview from the Pack, if one was chosen. */
  async function start(pack: Pack | null) {
    setStarting(true); // creating the Vault twice would give it two different keys, so it isn't offered again
    try {
      await onComplete({ unlockKey, accessToken: token?.value ?? null, pack });
    } catch {
      setFailed(true); // storage failed part-way
    }
  }

  return (
    <section>
      <h2 className="page-title">Set up in three steps</h2>
      <p className="lede">Your Scenarios stay in this browser. Two different things keep them safe and let you use AI.</p>
      <ol className="checklist">
        <ChecklistStep
          n={1}
          title="Access Token"
          why="From your teacher or group. Lets the app use AI for a limited time."
          state={stateOf("token")}
          summary={token ? `${token.active.label}, active until ${token.active.expiresAt.toLocaleString()}` : "skipped — you can add it later"}
        >
          <AccessTokenPanel
            onActive={(value, active) => { setToken({ value, active }); setStep("key"); }}
            onSkip={() => setStep("key")}
          />
        </ChecklistStep>
        <ChecklistStep n={2} title="Your Unlock Key" why="Made for you now. Locks your Scenarios on this device. Never expires." state={stateOf("key")} summary="saved">
          <UnlockKeyReveal unlockKey={unlockKey} onSaved={() => setStep("start")} />
        </ChecklistStep>
        <ChecklistStep n={3} title="Choose how to start" why="Your own Scenarios, or a Pack to try the app with first." state={stateOf("start")}>
          {/* Starting asks the browser for persistent storage (ADR 0001); Firefox shows a prompt at that moment. */}
          <p className="notice-info">
            Your browser may ask to let this site keep its data. Choose Allow: otherwise it can delete your Scenarios when
            space runs low, or after 7 days away (Safari).
          </p>
          {failed && (
            <p role="alert" className="notice-warn">
              Setup couldn't finish. Reload the page: if it asks for your Unlock Key, enter the one you saved.
            </p>
          )}
          <button type="button" className="choice" disabled={starting} onClick={() => void start(null)}>
            <strong>Start with my own Scenarios</strong>
            <span className="choice-detail">Write your first Scenario, by hand or with help.</span>
          </button>
          <p className="label-caps">Or start from a Pack</p>
          {SHIPPED_PACKS.map((pack) => (
            <button key={pack.name} type="button" className="choice" disabled={starting} onClick={() => void start(pack)}>
              <strong>Start from the {pack.name} Pack</strong>
              <span className="choice-detail">
                A ready Interview with {pack.questions.length} Questions, and {pack.exampleScenarios.length} Demo Scenarios to see matching work.
                Remove them in one step when you add your own.
              </span>
            </button>
          ))}
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
      <p className="unlock-key" aria-label="Your Unlock Key">
        {unlockKey.split("-").map((group, i) => (
          <span key={i} className="unlock-key-group">
            {i > 0 && <span className="unlock-key-separator">-</span>}
            {group}
          </span>
        ))}
      </p>
      <div className="actions">
        <button type="button" className="button-secondary" onClick={() => void navigator.clipboard.writeText(unlockKey).then(() => setCopied(true))}>
          {copied ? "✓ Copied" : "Copy"}
        </button>
        <a className="button-secondary" href={download} download="interview-helper-unlock-key.txt">
          Download .txt
        </a>
      </div>
      <p className="notice-warn">
        <strong>We only show this once.</strong> If you lose it, your Scenarios can't be recovered — not by us, not by
        anyone.
      </p>
      <label className="checkbox">
        <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
        I've saved my Unlock Key in a password manager or somewhere safe
      </label>
      <button type="button" className="button-primary" disabled={!saved} onClick={onSaved}>
        Continue
      </button>
    </>
  );
}
