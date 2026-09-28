// PROTOTYPE — the form pieces every access variant uses, so wording stays constant and only layout differs.
import { useState } from "react";
import { START_OVER_WORD, copyText, downloadKey, type Access } from "./access";

export function TokenForm({ access, onDone, onSkip }: { access: Access; onDone: () => void; onSkip?: () => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<"invalid" | "expired" | null>(null);
  const submit = () => {
    const e = access.submitToken(value);
    setError(e);
    if (!e) onDone();
  };
  return (
    <form className="ac-form" onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <input
        className={`ac-input ac-mono ${error ? "is-error" : ""}`}
        placeholder="IH-XXXXXX-XXXX-XXXX"
        value={value}
        onChange={(e) => { setValue(e.target.value); setError(null); }}
        autoComplete="off"
        spellCheck={false}
        aria-label="Access Token"
      />
      {error === "invalid" && <div className="ac-error">That token isn't recognised. Check it with whoever gave it to you.</div>}
      {error === "expired" && <div className="ac-error">That token has expired. Ask for a new one.</div>}
      <button className="ac-primary" disabled={!value.trim()}>Continue</button>
      {onSkip && <button type="button" className="ac-link" onClick={onSkip}>I don't have one yet</button>}
    </form>
  );
}

export function KeyReveal({ access, confirmed, setConfirmed }: { access: Access; confirmed: boolean; setConfirmed: (v: boolean) => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="ac-reveal">
      <div className="ac-key" aria-label="Your Unlock Key">
        {access.newKey.split("-").map((g, i) => <span key={i}>{g}</span>)}
      </div>
      <div className="ac-key-actions">
        <button type="button" className="ac-secondary" onClick={() => { copyText(access.newKey); setCopied(true); }}>{copied ? "✓ Copied" : "Copy"}</button>
        <button type="button" className="ac-secondary" onClick={() => downloadKey(access.newKey)}>Download .txt</button>
      </div>
      <div className="ac-warning">
        <strong>We only show this once.</strong> If you lose it, your stories can't be recovered — not by us, not by anyone.
      </div>
      <label className="ac-check">
        <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
        I've saved my Unlock Key in a password manager or somewhere safe
      </label>
    </div>
  );
}

export function UnlockForm({ access, onLost }: { access: Access; onLost: () => void }) {
  const [value, setValue] = useState("");
  const [wrong, setWrong] = useState(false);
  return (
    <form className="ac-form" onSubmit={(e) => { e.preventDefault(); setWrong(!access.unlock(value)); }}>
      <input
        className={`ac-input ac-mono ${wrong ? "is-error" : ""}`}
        placeholder="Paste your Unlock Key"
        value={value}
        onChange={(e) => { setValue(e.target.value); setWrong(false); }}
        autoComplete="off"
        spellCheck={false}
        aria-label="Unlock Key"
      />
      {wrong && <div className="ac-error">That key doesn't match. Check for typos — it's 24 letters and numbers.</div>}
      <button className="ac-primary" disabled={!value.trim()}>Unlock</button>
      <button type="button" className="ac-link" onClick={onLost}>Lost your Unlock Key? Start over</button>
    </form>
  );
}

export function StartOverForm({ access, onCancel }: { access: Access; onCancel: () => void }) {
  const [typed, setTyped] = useState("");
  const ready = typed.trim().toUpperCase() === START_OVER_WORD;
  return (
    <form className="ac-form" onSubmit={(e) => { e.preventDefault(); if (ready) access.startOver(); }}>
      <p className="ac-danger-text">
        Without your Unlock Key, your saved stories can't be opened. Starting over <strong>deletes them from this browser</strong> and gives you a new key.
      </p>
      <input className="ac-input" placeholder={`Type ${START_OVER_WORD} to confirm`} value={typed} onChange={(e) => setTyped(e.target.value)} aria-label="Confirmation word" />
      <button className="ac-danger" disabled={!ready}>Delete everything and start over</button>
      <button type="button" className="ac-link" onClick={onCancel}>Cancel — I found my key</button>
    </form>
  );
}

export function StartChoice({ access }: { access: Access }) {
  return (
    <div className="ac-choices">
      <button className="ac-choice" onClick={() => access.finishSetup(false)}>
        <strong>Start with my own stories</strong>
        <span>Write your first Scenario, by hand or with help.</span>
      </button>
      <button className="ac-choice" onClick={() => access.finishSetup(true)}>
        <strong>Try with demo stories</strong>
        <span>See matching work first. They're labelled demo and you can remove them in one step.</span>
      </button>
    </div>
  );
}
