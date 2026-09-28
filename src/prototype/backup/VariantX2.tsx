// PROTOTYPE — Variant X2: one drop zone. A big status card up top (backed up or not, with the export button),
// then a single "bring something in" area that accepts any file and works out whether it's a backup or a Pack.
// Everything that's happened is listed underneath as a short history.
import { useState } from "react";
import { SAMPLE_FILES, type Backup, type SampleFile } from "./backup";
import { FilePicker, ImportFlow, StorageNote } from "./Shared";

export function VariantX2({ backup }: { backup: Backup }) {
  // ?pick=<n> opens the flow with sample file n (for screenshots)
  const [file, setFile] = useState<SampleFile | null>(() => { const n = new URLSearchParams(location.search).get("pick"); return n ? SAMPLE_FILES[Number(n)] : null; });
  const never = !backup.lastExport;

  return (
    <main className="d2-main x2">
      <section className={`x2-status ${never ? "is-warn" : "is-ok"}`}>
        <div className="x2-status-icon">{never ? "!" : "✓"}</div>
        <div className="x2-status-body">
          <h1>{never ? "Your stories aren't backed up" : "Your stories are backed up"}</h1>
          <p>{never ? `All ${backup.stories} stories exist only in this browser. If it clears its data, they're gone.` : `Last backup ${backup.lastExport}, with ${backup.stories} stories.`}</p>
          <StorageNote backup={backup} />
        </div>
        <button className="bk-primary x2-cta" onClick={backup.exportNow}>{never ? "Back up now" : "Back up again"}</button>
      </section>

      <section className="bk-panel">
        <h2>Bring something in</h2>
        <p>A backup file from another device, or a Pack from your teacher or group. We'll work out which it is.</p>
        {file ? <ImportFlow backup={backup} file={file} onDone={() => setFile(null)} /> : <FilePicker label="Choose a file" onPick={setFile} />}
      </section>

      <div className="x2-bottom">
        <section className="bk-panel">
          <h2>Your Packs</h2>
          <ul className="bk-packs">
            {backup.packs.map((p) => (
              <li key={p.title}>
                <span><strong>{p.title}</strong><span className="bk-fine">{p.questions} Questions · {p.examples} Example Scenarios</span></span>
                <button className="bk-link" onClick={() => backup.removePack(p.title)}>Remove</button>
              </li>
            ))}
          </ul>
        </section>
        <section className="bk-panel">
          <h2>History</h2>
          <ul className="x2-history">
            {backup.history.map((h, i) => <li key={i}><span className="bk-fine">{h.when}</span> {h.what}</li>)}
          </ul>
        </section>
      </div>
    </main>
  );
}
