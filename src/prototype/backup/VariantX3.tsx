// PROTOTYPE — Variant X3: pick a task. The page asks "What do you want to do?" with three large choices —
// Back up, Restore on this device, Add a Pack — each with a one-line "when you'd use this". Choosing one opens
// a short guided flow on the same page with a Back link. A slim status line stays on top.
import { useState } from "react";
import { SAMPLE_FILES, type Backup, type SampleFile } from "./backup";
import { FilePicker, ImportFlow, StorageNote } from "./Shared";

type Task = "backup" | "restore" | "pack" | null;

export function VariantX3({ backup }: { backup: Backup }) {
  const [task, setTask] = useState<Task>(() => new URLSearchParams(location.search).get("task") as Task);
  // ?pick=<n> opens the flow with sample file n (for screenshots)
  const [file, setFile] = useState<SampleFile | null>(() => { const n = new URLSearchParams(location.search).get("pick"); return n ? SAMPLE_FILES[Number(n)] : null; });
  const never = !backup.lastExport;
  const back = () => { setTask(null); setFile(null); };

  return (
    <main className="d2-main x3">
      <div className={`x3-line ${never ? "is-warn" : ""}`}>
        <span>{never ? "⚠ Never backed up" : `✓ Backed up ${backup.lastExport}`} · {backup.stories} stories · {backup.packs.length} {backup.packs.length === 1 ? "Pack" : "Packs"}</span>
        <StorageNote backup={backup} />
      </div>

      {!task ? (
        <>
          <h1 className="bk-h1">What do you want to do?</h1>
          <div className="x3-choices">
            <button className={`x3-choice ${never ? "is-suggested" : ""}`} onClick={() => setTask("backup")}>
              {never && <span className="x3-tag">Recommended</span>}
              <strong>Back up my stories</strong>
              <span>Download one encrypted file. Do this now and then, and before switching devices.</span>
            </button>
            <button className="x3-choice" onClick={() => setTask("restore")}>
              <strong>Restore from a backup</strong>
              <span>New device or browser, or your data was cleared.</span>
            </button>
            <button className="x3-choice" onClick={() => setTask("pack")}>
              <strong>Add a Pack</strong>
              <span>Questions and examples your teacher or group shared.</span>
            </button>
          </div>
          {backup.packs.length > 0 && (
            <section className="x3-packs">
              <h2>Your Packs</h2>
              <ul className="bk-packs">
                {backup.packs.map((p) => (
                  <li key={p.title}><span><strong>{p.title}</strong><span className="bk-fine">{p.questions} Questions · {p.examples} Example Scenarios</span></span><button className="bk-link" onClick={() => backup.removePack(p.title)}>Remove</button></li>
                ))}
              </ul>
            </section>
          )}
        </>
      ) : (
        <section className="bk-panel x3-flow">
          <button className="bk-link x3-back" onClick={back}>← All tasks</button>
          {task === "backup" && (
            <>
              <h2>Back up my stories</h2>
              <ol className="x3-steps">
                <li>Download the file — it holds all {backup.stories} stories, encrypted.</li>
                <li>Keep it somewhere safe: cloud drive, USB stick, email to yourself.</li>
                <li>To open it later you'll need your Unlock Key.</li>
              </ol>
              <button className="bk-primary" onClick={backup.exportNow}>Download backup file</button>
              {backup.lastExport === "just now" && <div className="bk-result is-ok"><strong>✓ Backup downloaded</strong></div>}
            </>
          )}
          {task === "restore" && (
            <>
              <h2>Restore from a backup</h2>
              {file ? <ImportFlow backup={backup} file={file} onDone={() => setFile(null)} /> : <FilePicker accept="export" label="Choose your backup file" onPick={setFile} />}
            </>
          )}
          {task === "pack" && (
            <>
              <h2>Add a Pack</h2>
              {file ? <ImportFlow backup={backup} file={file} onDone={() => setFile(null)} /> : <FilePicker accept="pack" label="Choose the Pack file" onPick={setFile} />}
            </>
          )}
        </section>
      )}
    </main>
  );
}
