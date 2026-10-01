import { useMemo, useState } from "react";
import { useCancellableEffect } from "../hooks";
import type { UnlockedVault } from "../vault/vault";
import { isDemo, REMOVE_DEMO_FAILED, scenarioBank, type SavedScenario } from "./scenarioBank";
import { ScenarioForm } from "./ScenarioForm";
import { OriginBadge, ScenarioReader, SkillTags } from "./ScenarioReader";
import type { Scenario } from "./scenarioFormat";
import { countOf, unreadableNotice } from "../text";
import { hasSkill, skillCounts } from "./skills";
import { SkillsOverview } from "./SkillsOverview";

type Pane = { mode: "read" | "edit"; id: string } | { mode: "new" } | { mode: "none" };
type Loaded = { scenarios: SavedScenario[]; unreadable: number };

type Props = {
  vault: UnlockedVault;
  /** Skills the Interviews' Gaps asked for, for "Not covered yet". */
  gapSkills?: string[];
  /** A skill to start a new Scenario with (from a Gap), or null. The bank mounts afresh each time its tab opens,
   * so this is read once, as it opens. */
  startNew?: string | null;
};

/** The Candidate's Scenarios (C4 design): a skills overview on top, then a list on the left and the selected
 * Scenario in full on the right. On a phone the list and the Scenario are two screens. */
export function ScenarioBank({ vault, gapSkills = [], startNew = null }: Props) {
  const bank = useMemo(() => scenarioBank(vault), [vault]);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [pane, setPane] = useState<Pane>(startNew !== null ? { mode: "new" } : { mode: "none" });
  const [query, setQuery] = useState("");
  const [skillFilter, setSkillFilter] = useState<string | null>(null); // a skillKey
  const [overviewShown, setOverviewShown] = useState(true);
  const [failure, setFailure] = useState<string | null>(null);
  const [newSkill, setNewSkill] = useState(startNew ?? ""); // arriving from a Gap: its skill

  useCancellableEffect(
    (isCurrent) => {
      bank.list().then(
        (result) => isCurrent() && setLoaded(result),
        () => isCurrent() && setFailure("Couldn't open your Scenarios. Lock the app and unlock it again."),
      );
    },
    [bank],
  );

  /** Reloads the list after a change, dropping a skill filter that no Scenario matches any more. */
  async function reload() {
    const result = await bank.list();
    setLoaded(result);
    setSkillFilter((key) => (key && result.scenarios.some((s) => hasSkill(s.skills, key)) ? key : null));
  }

  async function save(scenario: Scenario, existingId?: string) {
    const id = await bank.save(scenario, existingId);
    await reload();
    setPane({ mode: "read", id });
  }

  async function remove(scenario: SavedScenario) {
    if (!confirm(`Delete "${scenario.title}"? This can't be undone.`)) return;
    try {
      await bank.delete(scenario.id);
      await reload();
      setPane({ mode: "none" });
    } catch {
      setFailure(`Couldn't delete "${scenario.title}". Try again.`); // only if the Vault is locked or storage fails
    }
  }

  async function removeDemo(count: number) {
    try {
      if (!(await bank.removeDemo(count))) return;
      await reload();
      setPane({ mode: "none" });
    } catch {
      setFailure(REMOVE_DEMO_FAILED);
    }
  }

  if (!loaded) return failure ? <p role="alert" className="notice-blocking">{failure}</p> : null;
  const { scenarios, unreadable } = loaded;
  const search = query.trim().toLowerCase();
  const matchesSearch = (scenario: SavedScenario) => [scenario.title, ...scenario.skills].some((text) => text.toLowerCase().includes(search));
  const shown = scenarios.filter((scenario) => (!skillFilter || hasSkill(scenario.skills, skillFilter)) && (!search || matchesSearch(scenario)));
  const selected = pane.mode === "read" || pane.mode === "edit" ? scenarios.find((s) => s.id === pane.id) : undefined;
  const filterName = skillCounts(scenarios).find((c) => c.key === skillFilter)?.skill;
  const demoCount = scenarios.filter(isDemo).length;

  return (
    <div className={`bank${pane.mode === "none" ? "" : " has-pane"}`}>
      <div className="bank-overview">
        {overviewShown ? (
          <>
            <div className="bank-overview-head">
              <h2 className="label-caps">Skills overview</h2>
              <button type="button" className="button-link" aria-label="Hide skills overview" onClick={() => setOverviewShown(false)}>
                Hide ▴
              </button>
            </div>
            <SkillsOverview
              scenarios={scenarios}
              gapSkills={gapSkills}
              filter={skillFilter}
              onFilter={setSkillFilter}
              onWrite={(skill) => {
                setNewSkill(skill);
                setPane({ mode: "new" });
              }}
            />
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
          <button
            type="button"
            className="button-primary"
            onClick={() => {
              setNewSkill("");
              setPane({ mode: "new" });
            }}
          >
            + New Scenario
          </button>
        </div>
        {failure && (
          <p role="alert" className="notice-warn">
            {failure}
          </p>
        )}
        {unreadable > 0 && (
          <p role="alert" className="notice-warn">
            {unreadableNotice(unreadable, "Scenario")}
          </p>
        )}
        {demoCount > 0 && (
          <p className="demo-bar">
            <span>{countOf(demoCount, "demo Scenario")}</span>
            <button type="button" className="button-link" onClick={() => void removeDemo(demoCount)}>
              Remove all demo
            </button>
          </p>
        )}
        <input
          type="search"
          className="field bank-search"
          placeholder="Search titles and skills"
          aria-label="Search titles and skills"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {skillFilter && filterName && (
          <p className="bank-filter">
            Skill: <strong>{filterName}</strong>{" "}
            <button type="button" className="button-link" aria-label={`Clear skill filter: ${filterName}`} onClick={() => setSkillFilter(null)}>
              ✕ Clear
            </button>
          </p>
        )}
        <ul className="bank-list" aria-label="Scenarios">
          {shown.map((scenario) => (
            <li key={scenario.id}>
              <button
                type="button"
                className={`bank-item${scenario.id === selected?.id ? " is-selected" : ""}`}
                onClick={() => setPane({ mode: "read", id: scenario.id })}
              >
                <span className="bank-item-title">{scenario.title}</span>
                <SkillTags skills={scenario.skills} />
                <OriginBadge origin={scenario.origin} />
              </button>
            </li>
          ))}
        </ul>
        {scenarios.length > 0 && shown.length === 0 && <p className="bank-hint">No Scenarios match. Try another search, or clear the skill filter.</p>}
      </div>
      <div className="bank-pane">
        {pane.mode !== "none" && (
          <button type="button" className="button-link bank-back" onClick={() => setPane({ mode: "none" })}>
            ← All Scenarios
          </button>
        )}
        {pane.mode === "none" && scenarios.length > 0 && <p className="bank-hint">Choose a Scenario to read it in full.</p>}
        {pane.mode === "none" && scenarios.length === 0 && (
          <p className="bank-hint">No Scenarios yet. Add your first with “+ New Scenario”, from your own career.</p>
        )}
        {pane.mode === "new" && (
          <>
            <h3 className="pane-title">New Scenario</h3>
            <div className="card">
              <ScenarioForm key={newSkill} skill={newSkill} onSave={save} onCancel={() => setPane({ mode: "none" })} />
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
