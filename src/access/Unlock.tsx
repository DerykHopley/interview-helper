import { useState, type FormEvent } from "react";

const START_OVER_WORD = "DELETE";

type Props = {
  /** Resolves to false when the key doesn't match. */
  onUnlock: (unlockKey: string) => Promise<boolean>;
  onStartOver: () => Promise<void>;
};

/** A returning Candidate's screen: the A2 checklist with only the Unlock Key step open, which also holds Start over
 * (ADR 0002). */
export function Unlock({ onUnlock, onStartOver }: Props) {
  const [lost, setLost] = useState(false);

  return (
    <section>
      <h2>Unlock your stories</h2>
      {lost ? <StartOver onStartOver={onStartOver} onCancel={() => setLost(false)} /> : <UnlockForm onUnlock={onUnlock} onLost={() => setLost(true)} />}
    </section>
  );
}

function UnlockForm({ onUnlock, onLost }: { onUnlock: Props["onUnlock"]; onLost: () => void }) {
  const [value, setValue] = useState("");
  const [wrong, setWrong] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setWrong(!(await onUnlock(value)));
  }

  return (
    <form onSubmit={(e) => void submit(e)}>
      <label htmlFor="unlock-key">Unlock Key</label>
      <p>The key you saved when you set up. It never expires.</p>
      <input id="unlock-key" value={value} onChange={(e) => { setValue(e.target.value); setWrong(false); }} autoComplete="off" spellCheck={false} />
      {wrong && <p role="alert">That key doesn't match. Check for typos — it's 24 letters and numbers.</p>}
      <button type="submit" disabled={!value.trim()}>
        Unlock
      </button>
      <button type="button" onClick={onLost}>
        Lost your Unlock Key? Start over
      </button>
    </form>
  );
}

function StartOver({ onStartOver, onCancel }: { onStartOver: Props["onStartOver"]; onCancel: () => void }) {
  const [typed, setTyped] = useState("");
  const ready = typed.trim().toUpperCase() === START_OVER_WORD;

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (ready) void onStartOver(); }}>
      <p>
        Without your Unlock Key, your saved stories can't be opened. Starting over <strong>deletes them from this browser</strong> and
        gives you a new key.
      </p>
      <label htmlFor="start-over-word">Confirmation word</label>
      <input id="start-over-word" placeholder={`Type ${START_OVER_WORD} to confirm`} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
      <button type="submit" disabled={!ready}>
        Delete everything and start over
      </button>
      <button type="button" onClick={onCancel}>
        Cancel — I found my key
      </button>
    </form>
  );
}
