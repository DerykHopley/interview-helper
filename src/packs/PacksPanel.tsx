import { useId, useState, type DragEvent } from "react";
import { ImportPreview } from "../backup/ImportPreview";
import { countOf } from "../text";
import type { UnlockedVault } from "../vault/vault";
import { addPack, planPack, type PackPlan } from "./choosePack";
import { readPack, type Pack } from "./packFormat";
import { SHIPPED_PACKS } from "./shippedPacks";

type Chosen = { pack: Pack; plan: PackPlan };

/** The Backup page's Packs panel (X4 design): the shipped Packs and a file to import, each previewed before it's
 * added. All of a Pack's text is untrusted, so it's only ever shown as plain text. */
export function PacksPanel({ vault, onAdded }: { vault: UnlockedVault; onAdded: (interviewId: string) => void }) {
  const id = useId();
  const [chosen, setChosen] = useState<Chosen | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  async function choose(pack: Pack) {
    setProblem(null);
    setChosen({ pack, plan: await planPack(pack, vault) });
  }

  async function importFile(file: File | undefined) {
    if (!file) return;
    setChosen(null);
    const reading = readPack(await file.text());
    if (reading.ok) await choose(reading.pack);
    else setProblem(reading.reason);
  }

  function drop(event: DragEvent) {
    event.preventDefault();
    void importFile(event.dataTransfer.files[0]);
  }

  return (
    <section className="backup-panel" aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`} className="backup-panel-title">
        Packs
      </h3>
      <p className="backup-panel-why">
        A Pack is a role to practise for: a ready Interview with its Questions, and Example Scenarios added as Demo
        Scenarios, so you can see matching work before writing your own.
      </p>
      {chosen ? (
        <ImportPreview
          label="Pack preview"
          summary={summaryOf(chosen)}
          confirmLabel="Add this Pack"
          onConfirm={async () => onAdded(await addPack(chosen.pack, vault))}
          onCancel={() => setChosen(null)}
        >
          <PackContents pack={chosen.pack} />
        </ImportPreview>
      ) : (
        <>
          <ul className="pack-list" aria-label="Packs to choose">
            {SHIPPED_PACKS.map((pack) => (
              <li key={pack.name}>
                <button type="button" className="pack-row" onClick={() => void choose(pack)}>
                  <strong>{pack.name}</strong>
                  <span className="pack-row-detail">
                    Ships with the app · {countOf(pack.questions.length, "Question")} · {countOf(pack.exampleScenarios.length, "Example Scenario")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <label className="drop-zone" onDragOver={(e) => e.preventDefault()} onDrop={drop}>
            <input
              type="file"
              className="visually-hidden"
              aria-label="Import a Pack file"
              accept=".md,.txt,text/markdown,text/plain"
              onChange={(e) => {
                void importFile(e.target.files?.[0]);
                e.target.value = ""; // so the same file can be chosen again
              }}
            />
            <strong>Import a Pack file</strong>
            <span className="drop-zone-detail">or drop it here</span>
          </label>
          {problem && (
            <p role="alert" className="notice-warn">
              {problem} Nothing was changed.
            </p>
          )}
        </>
      )}
    </section>
  );
}

function summaryOf({ pack, plan }: Chosen) {
  const adds = `Adds 1 Interview with ${countOf(pack.questions.length, "Question")}, and ${countOf(plan.newScenarios.length, "Demo Scenario")}.`;
  return plan.skipped > 0 ? `${adds} ${plan.skipped} ${plan.skipped === 1 ? "is" : "are"} already in your Scenario Bank, so ${plan.skipped === 1 ? "it's" : "they're"} skipped.` : adds;
}

function PackContents({ pack }: { pack: Pack }) {
  return (
    <>
      <h4 className="import-preview-title">{pack.name}</h4>
      {pack.company && <p className="import-preview-company">{pack.company}</p>}
      <p className="form-hint">
        {pack.jobSpec ? "Has a Job Spec, so you can ask for more Questions." : "No Job Spec: add more Questions by typing them."}
      </p>
      <p className="label-caps">Questions</p>
      <ol className="pack-questions">
        {pack.questions.map((q, i) => (
          <li key={i}>
            {q.text} <span className="skill-tag">{q.skill}</span>
          </li>
        ))}
      </ol>
      <p className="label-caps">Example Scenarios</p>
      <ul className="pack-examples">
        {pack.exampleScenarios.map((s, i) => (
          <li key={i}>{s.title}</li>
        ))}
      </ul>
      <p className="form-hint">
        They're copied into your Scenario Bank labelled Demo, and matched like your own until you remove them. The Pack
        itself is never matched.
      </p>
    </>
  );
}
