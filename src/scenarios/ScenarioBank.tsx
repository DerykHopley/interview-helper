import { useEffect, useMemo, useState } from "react";
import { CoWriting, type FromGap } from "../cowriting/CoWriting";
import type { Seed } from "../cowriting/coWriter";
import { useCancellableEffect } from "../hooks";
import type { UnlockedVault } from "../vault/vault";
import { isDemo, REMOVE_DEMO_FAILED, scenarioBank, type SavedScenario } from "./scenarioBank";
import { ScenarioForm } from "./ScenarioForm";
import { OriginBadge, ScenarioReader, SkillTags } from "./ScenarioReader";
import type { Scenario } from "./scenarioFormat";
import { interviewStore, type SavedInterview } from "../interviews/interviewStore";
import { picksOf } from "../interviews/picks";
import type { AccessHandlers } from "../model-gateway/callProblems";
import { countOf, unreadableNotice } from "../text";
import { hasSkill, skillCounts } from "./skills";
import { SkillsOverview } from "./SkillsOverview";

type Pane = { mode: "read" | "edit"; id: string } | { mode: "choose" | "new" | "co-write" } | { mode: "none" };
type Loaded = { scenarios: SavedScenario[]; unreadable: number };
/** What a co-writing chat starts from: a skill not covered yet, or a Gap's Question in an Interview (#13). */
export type CoWriteStart = { seed: Seed; fromGap?: FromGap };

type Props = {
  vault: UnlockedVault;
  /** Skills the Interviews' Gaps asked for, for "Not covered yet". */
  gapSkills?: string[];
  /** A skill to start a new Scenario with (from a Gap), or null. The bank mounts afresh each time its tab opens,
   * so this is read once, as it opens. */
  startNew?: string | null;
  /** A co-writing chat to start with, e.g. from a Gap (#13); read once, as the bank opens. */
  startCoWriting?: CoWriteStart | null;
  /** The Access Token: co-writing is offered only while one is active. */
  access: AccessHandlers;
  /** Tells the dashboard while a co-writing chat is open, so leaving it asks first (it lives in memory only). */
  onCoWritingChange: (open: boolean) => void;
};

/** The Candidate's Scenarios (C4 design): a skills overview on top, then a list on the left and the selected
 * Scenario in full on the right. On a phone the list and the Scenario are two screens. */
export function ScenarioBank({ vault, gapSkills = [], startNew = null, startCoWriting = null, access, onCoWritingChange }: Props) {
  const bank = useMemo(() => scenarioBank(vault), [vault]);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [pane, setPane] = useState<Pane>(startCoWriting ? { mode: "co-write" } : startNew !== null ? { mode: "new" } : { mode: "none" });
  const [coWrite, setCoWrite] = useState<CoWriteStart>(startCoWriting ?? { seed: {} });
  const [coWriteSaved, setCoWriteSaved] = useState(false); // from a Gap: saved, so leaving loses nothing
  const [query, setQuery] = useState("");
  const [skillFilter, setSkillFilter] = useState<string | null>(null); // a skillKey
  const [overviewShown, setOverviewShown] = useState(true);
  const [failure, setFailure] = useState<string | null>(null);
  const [newSkill, setNewSkill] = useState(startNew ?? ""); // arriving from a Gap: its skill
  const interviews = useMemo(() => interviewStore(vault), [vault]);
  const [picksIn, setPicksIn] = useState<SavedInterview[]>([]); // the Interviews, for where each Scenario is picked

  useCancellableEffect(
    (isCurrent) => {
      bank.list().then(
        (result) => isCurrent() && setLoaded(result),
        () => isCurrent() && setFailure("Couldn't open your Scenarios. Lock the app and unlock it again."),
      );
      interviews.list().then(
        (result) => isCurrent() && setPicksIn(result.interviews),
        () => {}, // the bank still works without "picked in"
      );
    },
    [bank, interviews],
  );
  const picksOfScenario = (id: string) => picksOf(picksIn, id);

  /** Reloads the list after a change, dropping a skill filter that no Scenario matches any more. */
  async function reload() {
    const result = await bank.list();
    setLoaded(result);
    // "Picked in" follows in the background, so saving or deleting doesn't wait for it.
    interviews.list().then(
      (result) => setPicksIn(result.interviews),
      () => {},
    );
    setSkillFilter((key) => (key && result.scenarios.some((s) => hasSkill(s.skills, key)) ? key : null));
  }

  useEffect(() => onCoWritingChange(pane.mode === "co-write" && !coWriteSaved), [pane.mode, coWriteSaved, onCoWritingChange]);

  /** Starts co-writing, or the hand-written form without an Access Token, for a skill not covered yet. */
  function writeFor(skill: string) {
    if (access.active) {
      setCoWrite({ seed: { skill } });
      setPane({ mode: "co-write" });
    } else {
      setNewSkill(skill);
      setPane({ mode: "new" });
    }
  }

  /** Saves a Scenario and shows it, or (`stay`) leaves the page as it is, e.g. to show a Gap's re-match. */
  async function save(scenario: Scenario, existingId?: string, { stay = false } = {}) {
    const id = await bank.save(scenario, existingId);
    await reload();
    if (!stay) setPane({ mode: "read", id });
    return id;
  }

  async function remove(scenario: SavedScenario) {
    const picked = picksOfScenario(scenario.id).length;
    const warning = picked > 0 ? ` It's the picked Scenario in ${countOf(picked, "Interview")}; those Questions will need a new pick.` : "";
    if (!confirm(`Delete "${scenario.title}"? This can't be undone.${warning}`)) return;
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

  if (pane.mode === "co-write") {
    const { seed, fromGap } = coWrite;
    return (
      <CoWriting
        seed={seed}
        fromGap={fromGap}
        onSave={async (scenario) => {
          const id = await save(scenario, undefined, { stay: Boolean(fromGap) }); // from a Gap, the page shows the re-match
          if (fromGap) setCoWriteSaved(true);
          return id;
        }}
        onDiscard={() => setPane({ mode: "none" })}
        onShowSaved={(id) => setPane({ mode: "read", id })}
        access={access}
      />
    );
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
              onWrite={writeFor}
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
              setPane({ mode: "choose" });
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
                {picksOfScenario(scenario.id).length > 0 && <span className="bank-picked">picked in {picksOfScenario(scenario.id).length}</span>}
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
        {pane.mode === "choose" && (
          <>
            <h3 className="pane-title">New Scenario</h3>
            <div className="card choices">
              <button type="button" className="choice" onClick={() => setPane({ mode: "new" })}>
                <strong>Write it myself</strong>
                <span className="choice-detail">Fill in the form: Situation, Task, Action, Result.</span>
              </button>
              <button type="button" className="choice" disabled={!access.active}
                onClick={() => {
                  setCoWrite({ seed: {} });
                  setPane({ mode: "co-write" });
                }}>
                <strong>Co-write with AI</strong>
                <span className="choice-detail">Answer a few questions. The AI arranges your own words, and never adds any.</span>
              </button>
              {!access.active && <span className="form-hint">Needs an active Access Token</span>}
            </div>
          </>
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
            pickedIn={picksOfScenario(selected.id).map(({ interview, numbers }) => `${interview.role} (${numbers.map((n) => `Q${n}`).join(", ")})`)}
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
