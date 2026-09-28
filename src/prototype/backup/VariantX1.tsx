// PROTOTYPE — Variant X1: three panels. A settings-style page: Back up (export) and Restore (import a Scenario
// Export) side by side, then Packs below with the ones you've added. Each panel runs its own flow in place.
import { useState } from "react";
import { SAMPLE_FILES, type Backup, type SampleFile } from "./backup";
import { FilePicker, ImportFlow, StorageNote } from "./Shared";

export function VariantX1({ backup }: { backup: Backup }) {
  // ?pick=<n> opens the flow with sample file n (for screenshots)
  const [restoreFile, setRestoreFile] = useState<SampleFile | null>(() => { const n = new URLSearchParams(location.search).get("pick"); return n ? SAMPLE_FILES[Number(n)] : null; });
  const [packFile, setPackFile] = useState<SampleFile | null>(null);
  const never = !backup.lastExport;

  return (
    <main className="d2-main x1">
      <h1 className="bk-h1">Backup &amp; import</h1>
      <p className="bk-lede">Your stories live only in this browser. A backup file is the only way to move them or get them back.</p>

      <div className="x1-grid">
        <section className={`bk-panel ${never ? "is-warn" : ""}`}>
          <h2>Back up your stories</h2>
          <p>Saves all {backup.stories} stories as one encrypted file. Only your Unlock Key can open it.</p>
          <div className="bk-status">{never ? "⚠ Never backed up" : `Last backup: ${backup.lastExport}`}</div>
          <button className="bk-primary" onClick={backup.exportNow}>Download backup file</button>
          <StorageNote backup={backup} />
        </section>

        <section className="bk-panel">
          <h2>Restore from a backup</h2>
          <p>Adds the stories from a backup file. Stories you already have stay as they are.</p>
          {restoreFile ? <ImportFlow backup={backup} file={restoreFile} onDone={() => setRestoreFile(null)} /> : <FilePicker accept="export" label="Choose a backup file" onPick={setRestoreFile} />}
        </section>
      </div>

      <section className="bk-panel x1-packs">
        <div className="x1-packs-head">
          <div>
            <h2>Packs</h2>
            <p>Shared interview content from teachers or your group: instructions, Questions and Example Scenarios.</p>
          </div>
        </div>
        <ul className="bk-packs">
          {backup.packs.map((p) => (
            <li key={p.title}>
              <span><strong>{p.title}</strong><span className="bk-fine">by {p.author} · {p.questions} Questions · {p.examples} Example Scenarios · added {p.added}</span></span>
              <button className="bk-link" onClick={() => backup.removePack(p.title)}>Remove</button>
            </li>
          ))}
        </ul>
        {packFile ? <ImportFlow backup={backup} file={packFile} onDone={() => setPackFile(null)} /> : <FilePicker accept="pack" label="Add a Pack" onPick={setPackFile} />}
      </section>
    </main>
  );
}
