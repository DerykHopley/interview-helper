import { useState, type ReactNode } from "react";

type Props = {
  /** Names the preview, e.g. "Pack preview". */
  label: string;
  /** What adding will do, e.g. "Adds 1 Interview with 6 Questions, and 4 Demo Scenarios." */
  summary: string;
  confirmLabel: string;
  /** Adds what's in the file; rejects when it couldn't. */
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  /** What's in the file, shown above the summary. */
  children: ReactNode;
};

/** The step every import shares: what a file holds and will add, before anything changes. Packs use it (#7), and
 * restoring a backup reuses it (#6). */
export function ImportPreview({ label, summary, confirmLabel, onConfirm, onCancel, children }: Props) {
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState(false);

  async function confirm() {
    setBusy(true);
    setFailure(false);
    try {
      await onConfirm();
    } catch {
      setFailure(true); // only if the Vault locked meanwhile, or storage is full
      setBusy(false);
    }
  }

  return (
    <section className="import-preview card" aria-label={label}>
      {children}
      <p className="import-summary">{summary}</p>
      {failure && (
        <p role="alert" className="notice-warn">
          Couldn't add it. Try again.
        </p>
      )}
      <div className="actions">
        <button type="button" className="button-primary" disabled={busy} onClick={() => void confirm()}>
          {confirmLabel}
        </button>
        <button type="button" className="button-secondary" disabled={busy} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </section>
  );
}
