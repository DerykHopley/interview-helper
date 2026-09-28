// PROTOTYPE — Variant X4: X1's panels with X3's status line. The big "Back up your stories" panel shrinks into
// the status line at the top (status, story and Pack counts, storage, and a small Download backup file button);
// Restore and Packs sit below as in X1.
import { useState } from "react";
import { SAMPLE_FILES, type Backup, type SampleFile } from "./backup";
import { FilePicker, ImportFlow, StorageNote } from "./Shared";

export function VariantX4({ backup }: { backup: Backup }) {
  // ?pick=<n> opens the restore flow with sample file n (for screenshots)
  const [restoreFile, setRestoreFile] = useState<SampleFile | null>(() => { const n = new URLSearchParams(location.search).get("pick"); return n ? SAMPLE_FILES[Number(n)] : null; });
  const [packFile, setPackFile] = useState<SampleFile | null>(null);
  const never = !backup.lastExport;

  return (
    <main className="d2-main x1">
      <h1 className="bk-h1">Backup &amp; import</h1>
      <div className={`x3-line x4-line ${never ? "is-warn" : ""}`}>
        <span className="x4-status">
          <span>{never ? "⚠ Never backed up" : `✓ Backed up ${backup.lastExport}`} · {backup.stories} stories · {backup.packs.length} {backup.packs.length === 1 ? "Pack" : "Packs"}</span>
          <StorageNote backup={backup} />
        </span>
        <button className="bk-primary x4-download" onClick={backup.exportNow} title="One encrypted file; only your Unlock Key can open it">Download backup file</button>
      </div>

      <div className="x1-grid x4-grid">
        <section className="bk-panel">
          <h2>Restore from a backup</h2>
          <p>Adds the stories from a backup file. Stories you already have stay as they are.</p>
          {restoreFile ? <ImportFlow backup={backup} file={restoreFile} onDone={() => setRestoreFile(null)} /> : <FilePicker accept="export" label="Choose a backup file" onPick={setRestoreFile} />}
        </section>

        <section className="bk-panel">
          <h2>Packs</h2>
          <p>Shared interview content from teachers or your group: instructions, Questions and Example Scenarios.</p>
          <ul className="bk-packs">
            {backup.packs.map((p) => (
              <li key={p.title}>
                <span><strong>{p.title}</strong><span className="bk-fine">by {p.author} · {p.questions} Questions · {p.examples} Example Scenarios</span></span>
                <button className="bk-link" onClick={() => backup.removePack(p.title)}>Remove</button>
              </li>
            ))}
          </ul>
          {packFile ? <ImportFlow backup={backup} file={packFile} onDone={() => setPackFile(null)} /> : <FilePicker accept="pack" label="Add a Pack" onPick={setPackFile} />}
        </section>
      </div>
    </main>
  );
}
