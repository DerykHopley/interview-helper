import { useEffect, useMemo, useRef, useState } from "react";
import { CoWriting, type RematchOutcome } from "../cowriting/CoWriting";
import { rematchQuestion } from "../matching/rematch";
import { useModelGateway } from "../model-gateway/context";
import { useCancellableEffect } from "../hooks";
import type { UnlockedVault } from "../vault/vault";
import { isDemo, REMOVE_DEMO_FAILED, scenarioBank, type SavedScenario } from "./scenarioBank";
import { ScenarioForm } from "./ScenarioForm";
import { OriginBadge, ScenarioReader, SkillTags } from "./ScenarioReader";
import type { Scenario } from "./scenarioFormat";
import type { AccessHandlers } from "../model-gateway/callProblems";
import { countOf, unreadableNotice } from "../text";
import { hasSkill, skillCounts } from "./skills";
import { SkillsOverview } from "./SkillsOverview";

type Pane = { mode: "read" | "edit"; id: string } | { mode: "choose" | "new" | "co-write" } | { mode: "none" };
type Loaded = { scenarios: SavedScenario[]; unreadable: number };
/** What a co-writing chat starts from: a skill not covered yet, or a Gap's Question in an Interview (#13). */
export type CoWriteStart = { skill?: string; gap?: { interviewId: string; questionId: string; question: string } };

type Props = {
  vault: UnlockedVault;
  /** Skills the Interviews' Gaps asked for, for "Not covered yet". */
  gapSkills?: string[];
  /** A skill to start a new Scenario with (from a Gap), or null. The bank mounts afresh each time its tab opens,
   * so this is read once, as it opens. */
  startNew?: string | null;
  /** A co-writing chat to start with, e.g. from a Gap (#13); read once, as the bank opens. */
  startCoWriting?: CoWriteStart | null;
  /** Opens a Gap's Question again, its new Matches dealt, after the Scenario written for it is saved. */
  onBackToQuestion?: (interviewId: string, questionId: string) => void;
  /** The Access Token: co-writing is offered only while one is active. */
  access: AccessHandlers;
  /** Tells the dashboard while a co-writing chat is open, so leaving it asks first (it lives in memory only). */
  onCoWritingChange: (open: boolean) => void;
};

/** The Candidate's Scenarios (C4 design): a skills overview on top, then a list on the left and the selected
 * Scenario in full on the right. On a phone the list and the Scenario are two screens. */
export function ScenarioBank({ vault, gapSkills = [], startNew = null, startCoWriting = null, onBackToQuestion = () => {}, access, onCoWritingChange }: Props) {
  const gateway = useModelGateway();
  const bank = useMemo(() => scenarioBank(vault), [vault]);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [pane, setPane] = useState<Pane>(startCoWriting ? { mode: "co-write" } : startNew !== null ? { mode: "new" } : { mode: "none" });
  const [coWrite, setCoWrite] = useState<CoWriteStart>(startCoWriting ?? {});
  const [coWriteSaved, setCoWriteSaved] = useState(false); // from a Gap: saved, so leaving loses nothing
  const savedId = useRef<string | null>(null); // the Scenario co-written from a Gap, to tell whether it's the new best Match
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

  useEffect(() => onCoWritingChange(pane.mode === "co-write" && !coWriteSaved), [pane.mode, coWriteSaved, onCoWritingChange]);

  /** Starts co-writing, or the hand-written form without an Access Token, for a skill not covered yet. */
  function writeFor(skill: string) {
    if (access.active) {
      setCoWrite({ skill });
      setPane({ mode: "co-write" });
    } else {
      setNewSkill(skill);
      setPane({ mode: "new" });
    }
  }

  /** From a Gap: re-matches its Question against every Scenario, the new one included. */
  async function rematchGap({ interviewId, questionId }: NonNullable<CoWriteStart["gap"]>): Promise<RematchOutcome> {
    const { result, scenarios } = await rematchQuestion(gateway, vault, interviewId, questionId);
    const best = result.matches[0];
    if (result.gap || !best) return { gap: true };
    const title = scenarios.find((s) => s.id === best.scenarioId)?.title ?? "";
    return { gap: false, title, score: best.score, reason: best.reason, isNew: best.scenarioId === savedId.current };
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

  if (pane.mode === "co-write") {
    const { gap } = coWrite;
    return (
      <CoWriting
        seed={{ skill: coWrite.skill, gap: gap && { question: gap.question } }}
        onSave={async (scenario) => {
          if (!gap) return save(scenario);
          savedId.current = await bank.save(scenario); // the page stays, to show the re-match
          setCoWriteSaved(true);
          await reload();
        }}
        onDiscard={() => setPane({ mode: "none" })}
        access={access}
        fromGap={gap && { rematch: () => rematchGap(gap), onBack: () => onBackToQuestion(gap.interviewId, gap.questionId) }}
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
                  setCoWrite({});
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
