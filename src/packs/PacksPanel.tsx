import { useId, useState, type DragEvent } from "react";
import { ImportPreview } from "../backup/ImportPreview";
import { countOf } from "../text";
import type { UnlockedVault } from "../vault/vault";
import { addPack, planPack, type PackPlan } from "./addPack";
import type { Scenario } from "../scenarios/scenarioFormat";
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
    try {
      setChosen({ pack, plan: await planPack(pack, vault) });
    } catch {
      setProblem("Couldn't read your Scenario Bank to preview this Pack. Try again."); // the Vault locked, or storage failed
    }
  }

  async function importFile(file: File | undefined) {
    if (!file) return;
    setChosen(null);
    let content: string;
    try {
      content = await file.text();
    } catch {
      return setProblem("Couldn't read that file. Try again.");
    }
    const reading = readPack(content);
    if (reading.ok) await choose(reading.pack);
    else setProblem(`${reading.reason} Nothing was changed.`);
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
          <PackContents pack={chosen.pack} skipped={chosen.plan.skipped} />
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
              {problem}
            </p>
          )}
        </>
      )}
    </section>
  );
}

function summaryOf({ pack, plan }: Chosen) {
  const adds = `Adds 1 Interview with ${countOf(pack.questions.length, "Question")}, and ${countOf(plan.newScenarios.length, "Demo Scenario")}.`;
  return plan.skipped.length > 0 ? `${adds} Skips ${countOf(plan.skipped.length, "Example Scenario")} already in your Scenario Bank.` : adds;
}

function PackContents({ pack, skipped }: { pack: Pack; skipped: Scenario[] }) {
  return (
    <>
      <h4 className="import-preview-title">{pack.name}</h4>
      {pack.company && <p className="import-preview-company">{pack.company}</p>}
      <p className="form-hint">
        {pack.jobSpec ? "Has a Job Spec, so you can ask for more Questions." : "No Job Spec: add more Questions by typing them."}
      </p>
      <p className="label-caps">Questions</p>
      <ol className="pack-questions" aria-label="Questions">
        {pack.questions.map((q, i) => (
          <li key={i}>
            {q.text} <span className="skill-tag">{q.skill}</span>
          </li>
        ))}
      </ol>
      <p className="label-caps">Example Scenarios</p>
      <ul className="pack-examples" aria-label="Example Scenarios">
        {pack.exampleScenarios.map((s, i) => (
          <li key={i} className={skipped.includes(s) ? "is-skipped" : undefined}>
            {s.title}
            {skipped.includes(s) && " · already here"}
          </li>
        ))}
      </ul>
      <p className="form-hint">
        They're copied into your Scenario Bank labelled Demo, and matched like your own until you remove them. The Pack
        itself is never matched.
      </p>
    </>
  );
}
