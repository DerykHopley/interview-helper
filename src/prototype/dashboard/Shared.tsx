// PROTOTYPE — pieces every dashboard variant uses, so wording stays constant and only layout differs.
import { useState } from "react";
import { SAMPLE_SPEC, guessTitle, type Dashboard } from "./data";

export function AccessChip({ dash }: { dash: Dashboard }) {
  const t = dash.token;
  return <span className={`db-chip ${t === "active" ? "is-ok" : "is-warn"}`}>{t === "active" ? "Access · 6h left" : t === "expired" ? "Access expired" : "No Access Token"}</span>;
}

export function LockButton() {
  return <a className="db-lock" href="/prototype/access?variant=A2&scenario=returning" title="Lock now">🔒 Lock</a>;
}

/** Paste a Job Spec → see the detected role → generate Questions (or create empty when AI is off). */
export function CreateInterviewForm({ dash, onDone, onCancel }: { dash: Dashboard; onDone: () => void; onCancel?: () => void }) {
  const [spec, setSpec] = useState("");
  const ai = dash.token === "active";
  const title = spec.trim() ? guessTitle(spec) : null;
  const create = (generate: boolean) => { dash.create(spec, generate); onDone(); };

  return (
    <div className="db-create">
      <label className="db-label" htmlFor="spec">Paste the Job Spec</label>
      <textarea id="spec" className="db-textarea" rows={7} placeholder="Paste the job description here — the whole ad is fine." value={spec} onChange={(e) => setSpec(e.target.value)} />
      <div className="db-create-row">
        <button type="button" className="db-link" onClick={() => setSpec(SAMPLE_SPEC)}>Use a sample Job Spec</button>
        {title && <span className="db-detected">Looks like: <strong>{title.role}</strong> at <strong>{title.company}</strong></span>}
      </div>
      {!ai && (
        <div className="db-note">
          {dash.token === "expired" ? "Your Access Token has expired, so" : "Without an Access Token,"} Questions can't be generated. You can still create the Interview and type your own Questions.
        </div>
      )}
      <div className="db-create-actions">
        {ai ? (
          <button className="db-primary" disabled={!spec.trim()} onClick={() => create(true)}>Create and generate ~8 Questions</button>
        ) : (
          <button className="db-primary" disabled={!spec.trim()} onClick={() => create(false)}>Create without Questions</button>
        )}
        {onCancel && <button className="db-link" onClick={onCancel}>Cancel</button>}
      </div>
      <div className="db-fine">Instructions hidden in a Job Spec are treated as plain text.</div>
    </div>
  );
}

/** Stand-in for the Scenario Bank and Backup pages, which are prototyped next. */
export function StubPage({ kind, dash }: { kind: "bank" | "backup"; dash: Dashboard }) {
  const { bank } = dash;
  return (
    <div className="db-stub">
      <div className="db-stub-tag">Prototyped next</div>
      {kind === "bank" ? (
        <>
          <h2>Scenario Bank</h2>
          <p>{bank.scenarios} stories{bank.demo ? `, ${bank.demo} of them demo` : ""}. Here you'll list, read, write, edit and delete Scenarios, and co-write new ones.</p>
          {bank.demo > 0 && <button className="db-secondary" onClick={dash.removeDemo}>Remove demo stories</button>}
        </>
      ) : (
        <>
          <h2>Backup &amp; import</h2>
          <p>Last export: {bank.lastExport ?? "never"}. Here you'll export your Scenarios as an encrypted file, import one, and import Packs.</p>
          <button className="db-secondary" onClick={dash.exportNow}>Export now (fake)</button>
        </>
      )}
    </div>
  );
}

export function Progress({ picked, total }: { picked: number; total: number }) {
  return (
    <span className="db-progress" aria-label={`${picked} of ${total} picked`}>
      <span style={{ width: total ? `${(picked / total) * 100}%` : 0 }} />
    </span>
  );
}
