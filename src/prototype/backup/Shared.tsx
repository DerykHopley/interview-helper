// PROTOTYPE — the import flow every Backup variant uses: pick a file → it's recognised → the right next step.
// Wording stays constant; only where and how the variants present it differs.
import { useState } from "react";
import { SAMPLE_FILES, type Backup, type SampleFile } from "./backup";

/** Stand-in for a file picker / drop zone: lists the sample files. */
export function FilePicker({ onPick, accept, label = "Choose a file" }: { onPick: (f: SampleFile) => void; accept?: "export" | "pack"; label?: string }) {
  const [open, setOpen] = useState(false);
  const files = SAMPLE_FILES.filter((f) => !accept || f.kind === accept || f.kind === "unknown");
  return (
    <div className="bk-picker">
      <button className="bk-drop" onClick={() => setOpen((v) => !v)}>
        <strong>{label}</strong>
        <span>or drop it here</span>
      </button>
      {open && (
        <ul className="bk-samples">
          <li className="bk-samples-note">Prototype — pick a sample file:</li>
          {files.map((f) => <li key={f.name}><button onClick={() => { onPick(f); setOpen(false); }}>{f.name}</button></li>)}
        </ul>
      )}
    </div>
  );
}

/** What happens after a file is picked — one component for every file type, so the flows match across variants. */
export function ImportFlow({ backup, file, onDone }: { backup: Backup; file: SampleFile; onDone: () => void }) {
  const [typed, setTyped] = useState("");
  const [keyOk, setKeyOk] = useState(file.kind === "export" && file.sameKey);
  const [wrong, setWrong] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  if (done) return <div className="bk-result is-ok"><strong>✓ {done}</strong><button className="bk-link" onClick={onDone}>Done</button></div>;

  if (file.kind === "unknown")
    return (
      <div className="bk-result is-bad">
        <strong>That isn't a file this app can read.</strong>
        <p>Choose a Scenario Export (<code>.ihx</code>) or a Pack (<code>.zip</code>).</p>
        <button className="bk-link" onClick={onDone}>Try another file</button>
      </div>
    );

  if (file.kind === "pack" && !file.ok)
    return (
      <div className="bk-result is-bad">
        <strong>This Pack can't be added.</strong>
        <p>{file.title}: {file.reason}</p>
        <p className="bk-fine">Nothing was changed. Ask whoever made the Pack to fix it.</p>
        <button className="bk-link" onClick={onDone}>Try another file</button>
      </div>
    );

  if (file.kind === "pack")
    return (
      <div className="bk-preview">
        <div className="bk-preview-kind">Pack</div>
        <strong className="bk-preview-title">{file.title}</strong>
        <span className="bk-fine">by {file.author}</span>
        <ul className="bk-contents">
          <li>{file.instructions} set of interview instructions</li>
          <li>{file.questions} Questions</li>
          <li>{file.examples} Example Scenarios — shown as examples only, never matched as your stories</li>
        </ul>
        <div className="bk-actions">
          <button className="bk-primary" onClick={() => { backup.addPack(file); setDone(`Added ${file.title}`); }}>Add Pack</button>
          <button className="bk-link" onClick={onDone}>Cancel</button>
        </div>
      </div>
    );

  // Scenario Export
  const added = file.stories - file.duplicates;
  return (
    <div className="bk-preview">
      <div className="bk-preview-kind">Scenario Export · made {file.made}</div>
      <strong className="bk-preview-title">{file.name}</strong>
      {!keyOk ? (
        <form className="bk-keyform" onSubmit={(e) => { e.preventDefault(); const ok = backup.checkKey(file, typed); setKeyOk(ok); setWrong(!ok); }}>
          <p>This file was made with a different Unlock Key. Enter the key you used when you made it.</p>
          <input className={`bk-input ${wrong ? "is-error" : ""}`} placeholder="Paste that Unlock Key" value={typed} onChange={(e) => { setTyped(e.target.value); setWrong(false); }} />
          {wrong && <div className="bk-error">That key can't open this file. It was made with a different key.</div>}
          <div className="bk-actions"><button className="bk-primary" disabled={!typed.trim()}>Open file</button><button type="button" className="bk-link" onClick={onDone}>Cancel</button></div>
        </form>
      ) : (
        <>
          <p className="bk-count">
            <strong>{file.stories} stories</strong> in this file.{" "}
            {file.duplicates ? <><strong>{added} new</strong> will be added; {file.duplicates} you already have will be skipped.</> : <>All {added} will be added to your {backup.stories}.</>}
          </p>
          <p className="bk-fine">Nothing you already have is changed or deleted.</p>
          <div className="bk-actions">
            <button className="bk-primary" disabled={!added} onClick={() => { backup.importExport(file); setDone(`Added ${added} ${added === 1 ? "story" : "stories"}`); }}>Add {added} {added === 1 ? "story" : "stories"}</button>
            <button className="bk-link" onClick={onDone}>Cancel</button>
          </div>
        </>
      )}
    </div>
  );
}

export function StorageNote({ backup }: { backup: Backup }) {
  return backup.persistent === "granted" ? (
    <span className="bk-storage is-ok">✓ This browser has agreed to keep your data</span>
  ) : (
    <span className="bk-storage is-warn">This browser may clear your data after a while. <button className="bk-link" onClick={backup.askPersistent}>Ask it to keep it</button></span>
  );
}
