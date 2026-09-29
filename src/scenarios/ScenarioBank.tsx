import { useMemo, useState } from "react";
import { useCancellableEffect } from "../hooks";
import type { UnlockedVault } from "../vault/vault";
import { scenarioBank, type SavedScenario } from "./scenarioBank";
import { ScenarioForm } from "./ScenarioForm";
import { ScenarioReader, SkillTags, OriginBadge } from "./ScenarioReader";
import { SkillsOverview, skillCounts } from "./SkillsOverview";
import type { Scenario } from "./scenarioFormat";

type Pane = { mode: "read" | "edit"; id: string } | { mode: "new" } | { mode: "none" };

/** The Candidate's Scenarios: a list on the left, the selected one in full on the right (C4 design). */
export function ScenarioBank({ vault }: { vault: UnlockedVault }) {
  const bank = useMemo(() => scenarioBank(vault), [vault]);
  const [scenarios, setScenarios] = useState<SavedScenario[] | null>(null);
  const [pane, setPane] = useState<Pane>({ mode: "none" });
  const [query, setQuery] = useState("");
  const [skill, setSkill] = useState<string | null>(null);
  const [overviewShown, setOverviewShown] = useState(true);

  useCancellableEffect(
    (isCurrent) => {
      void bank.list().then((list) => {
        if (isCurrent()) setScenarios(list);
      });
    },
    [bank],
  );

  async function save(scenario: Scenario, existingId?: string) {
    const id = await bank.save(scenario, existingId);
    setScenarios(await bank.list());
    setPane({ mode: "read", id });
  }

  async function remove(scenario: SavedScenario) {
    if (!confirm(`Delete "${scenario.title}"? This can't be undone.`)) return;
    await bank.delete(scenario.id);
    setScenarios(await bank.list());
    setPane({ mode: "none" });
  }

  if (!scenarios) return null;
  const q = query.trim().toLowerCase();
  const shown = scenarios.filter(
    (s) => (!skill || s.skills.some((t) => t.toLowerCase() === skill)) && (!q || [s.title, ...s.skills].some((t) => t.toLowerCase().includes(q))),
  );
  const selected = pane.mode === "read" || pane.mode === "edit" ? scenarios.find((s) => s.id === pane.id) : undefined;

  return (
    <div className={`bank${pane.mode === "none" ? "" : " has-pane"}`}>
      <div className="bank-overview">
        {overviewShown ? (
          <>
            <div className="bank-overview-head">
              <h3 className="section-label">Skills overview</h3>
              <button type="button" className="button-link" aria-label="Hide skills overview" onClick={() => setOverviewShown(false)}>
                Hide ▴
              </button>
            </div>
            <SkillsOverview scenarios={scenarios} filter={skill} onFilter={setSkill} />
          </>
        ) : (
          <button type="button" className="overview-folded" onClick={() => setOverviewShown(true)}>
            {skillCounts(scenarios).length} skills covered · Show ▾
          </button>
        )}
      </div>
      <div className="bank-list-column">
        <div className="bank-head">
          <h2 className="page-title">Scenario Bank</h2>
          <button type="button" className="button-primary" onClick={() => setPane({ mode: "new" })}>
            + New Scenario
          </button>
        </div>
        <input
          type="search"
          className="field bank-search"
          placeholder="Search titles and skills"
          aria-label="Search titles and skills"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <ul className="bank-list" aria-label="Scenarios">
          {shown.map((s) => (
            <li key={s.id}>
              <button type="button" className={`bank-item${s.id === selected?.id ? " is-selected" : ""}`} onClick={() => setPane({ mode: "read", id: s.id })}>
                <span className="bank-item-title">{s.title}</span>
                <SkillTags skills={s.skills} />
                <OriginBadge origin={s.origin} />
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="bank-pane">
        {pane.mode !== "none" && (
          <button type="button" className="button-link bank-back" onClick={() => setPane({ mode: "none" })}>
            ← All Scenarios
          </button>
        )}
        {pane.mode === "none" && scenarios.length > 0 && <p className="bank-hint">Choose a Scenario to read it in full.</p>}
        {pane.mode === "none" && scenarios.length === 0 && (
          <p className="bank-hint">No Scenarios yet. Add your first with “+ New Scenario”: a real story from your own career.</p>
        )}
        {pane.mode === "new" && (
          <>
            <h3 className="pane-title">New Scenario</h3>
            <div className="card">
              <ScenarioForm onSave={save} onCancel={() => setPane({ mode: "none" })} />
            </div>
          </>
        )}
        {selected && pane.mode === "edit" && (
          <>
            <h3 className="pane-title">Edit Scenario</h3>
            <div className="card">
              <ScenarioForm initial={selected} onSave={(s) => save(s, selected.id)} onCancel={() => setPane({ mode: "read", id: selected.id })} />
            </div>
          </>
        )}
        {selected && pane.mode === "read" && (
          <ScenarioReader
            scenario={selected}
            actions={
              <div className="actions">
                <button type="button" className="button-secondary" onClick={() => setPane({ mode: "edit", id: selected.id })}>
                  Edit
                </button>
                <button type="button" className="button-link" onClick={() => void remove(selected)}>
                  Delete
                </button>
              </div>
            }
          />
        )}
      </div>
    </div>
  );
}
