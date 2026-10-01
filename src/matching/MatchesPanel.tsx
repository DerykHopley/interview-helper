import { SHARED_PROBLEM_TEXT, type CallProblem } from "../model-gateway/callProblems";
import { NO_SKILL } from "../interviews/gaps";
import type { MatchResult } from "../interviews/interview";
import { questionList } from "../interviews/picks";
import type { SavedScenario } from "../scenarios/scenarioBank";

/** Why Matches couldn't be found or kept just now. */
export type MatchProblem = CallProblem | "no-scenarios" | "not-saved";

/** What has changed since a Question's Matches were found: the Candidate's Scenarios, or the app's Matcher or
 * Prompt Variant. */
export type Staleness = "scenarios" | "matcher";

const STALE_TEXT: Record<Staleness, string> = {
  scenarios: "Your Scenarios have changed since these Matches were found.",
  matcher: "Matching has changed since these Matches were found.",
};

type Props = {
  finding: boolean;
  problem: MatchProblem | null;
  matchResult: MatchResult | undefined;
  /** What has changed since these Matches were found, if anything. */
  stale: Staleness | null;
  skill: string | undefined;
  /** The Candidate's Scenarios, to show each Match's title and demo label; null until they've been read. */
  scenarios: SavedScenario[] | null;
  onRetry: () => void;
  onNeedToken: () => void;
  onOpenScenarioBank: () => void;
  onWriteScenario: () => void;
  picking: Picking;
};

/** Picking a Match for this Question (#11). */
export type Picking = {
  /** The Scenario picked for it, if any. */
  pickedScenarioId?: string;
  /** Picks a Scenario, or un-picks (null). */
  onPick: (scenarioId: string | null) => void;
  /** The other Questions (Q numbers) a Scenario is already picked for in this Interview. */
  usedFor: (scenarioId: string) => number[];
  /** A pick that re-matching cleared, by its title. */
  droppedPick: string | null;
};

type Action = "retry" | "token" | "scenario-bank";
const ACTION_LABEL: Record<Action, string> = { retry: "Try again", token: "Enter a new token", "scenario-bank": "Open Scenario Bank" };

/** What each problem says, and the one thing the Candidate can do about it. */
const PROBLEMS: Record<MatchProblem, { text: string; action: Action }> = {
  "no-token": { text: "Matches can't be found without an Access Token.", action: "token" },
  "expired-token": { text: "Matches can't be found — your Access Token has expired.", action: "token" },
  "no-scenarios": { text: "You have no Scenarios to match yet.", action: "scenario-bank" },
  unreachable: { text: SHARED_PROBLEM_TEXT.unreachable, action: "retry" },
  "cut-off": { text: SHARED_PROBLEM_TEXT["cut-off"], action: "retry" },
  failed: { text: "Finding Matches didn't work this time.", action: "retry" },
  "not-saved": { text: "Couldn't save the Matches. Try again.", action: "retry" },
};

/** What's dealt below a Question card (S3): finding placeholders, the fanned Matches, or the Gap card. */
export function MatchesPanel({
  finding,
  problem,
  matchResult,
  stale,
  skill,
  scenarios,
  onRetry,
  onNeedToken,
  onOpenScenarioBank,
  onWriteScenario,
  picking: { pickedScenarioId, onPick, usedFor, droppedPick },
}: Props) {
  const act: Record<Action, () => void> = { retry: onRetry, token: onNeedToken, "scenario-bank": onOpenScenarioBank };
  const staleNote = stale && (
    <p className="matches-status">
      {STALE_TEXT[stale]}{" "}
      <button type="button" className="button-link" onClick={onRetry}>
        Re-run matching
      </button>
    </p>
  );

  const droppedNote = droppedPick && <p className="matches-status">Your pick, “{droppedPick}”, isn't among the new Matches. Pick again.</p>;

  if (finding || (matchResult && !matchResult.gap && scenarios === null)) {
    return (
      <div className="matches is-finding" aria-busy="true">
        <div className="match-fan" aria-hidden="true">
          <span className="match-card is-placeholder" />
          <span className="match-card is-placeholder" />
          <span className="match-card is-placeholder" />
        </div>
        <p className="matches-status">Finding your Matches…</p>
      </div>
    );
  }
  if (problem) {
    const { text, action } = PROBLEMS[problem];
    return (
      <div className="matches" role="alert">
        <p className="notice-warn">{text}</p>
        <button type="button" className="button-secondary" onClick={act[action]}>
          {ACTION_LABEL[action]}
        </button>
      </div>
    );
  }
  if (!matchResult) return null;
  if (matchResult.gap) {
    return (
      <section className="matches gap-card" aria-labelledby="gap-title">
        <p className="label-caps gap-label">Gap · {skill ?? NO_SKILL}</p>
        <h3 id="gap-title" className="gap-title">
          No Scenario fits this Question yet
        </h3>
        {matchResult.suggestion && <p className="gap-suggestion">{matchResult.suggestion}</p>}
        {droppedNote}
        {staleNote}
        <div className="actions">
          <button type="button" className="button-primary" onClick={onWriteScenario}>
            Write a Scenario for this
          </button>
          {!stale && (
            <button type="button" className="button-link" onClick={onRetry}>
              Re-run matching
            </button>
          )}
        </div>
      </section>
    );
  }
  const ranked = matchResult.matches
    .map((match, rank) => ({ match, rank, scenario: scenarios?.find((s) => s.id === match.scenarioId) }))
    .filter((m) => m.scenario); // a Scenario deleted since matching isn't shown
  // The fan's middle card (the first) is the picked one, or the best Match if none is picked (S3).
  const shown = [...ranked.filter((m) => m.match.scenarioId === pickedScenarioId), ...ranked.filter((m) => m.match.scenarioId !== pickedScenarioId)];
  return (
    <div className="matches">
      {droppedNote}
      <ol className="match-fan" aria-label="Matches">
        {shown.map(({ match, rank, scenario }) => {
          const picked = match.scenarioId === pickedScenarioId;
          const used = usedFor(match.scenarioId);
          return (
            <li key={match.scenarioId}>
              {/* Named by its title; the pressed state says whether it's picked, the rest describes it. */}
              <button
                type="button"
                className={`match-card${rank === 0 ? " is-best" : ""}${picked ? " is-picked" : ""}`}
                aria-pressed={picked}
                aria-labelledby={`match-title-${match.scenarioId}`}
                aria-describedby={`match-about-${match.scenarioId}`}
                onClick={() => onPick(picked ? null : match.scenarioId)}
              >
                <span className="label-caps match-rank">
                  {rank === 0 ? "Best fit" : `#${rank + 1}`} · {Math.round(match.score)}%
                </span>
                {/* Near the top, so it shows above the answer bar before any scrolling. */}
                {used.length > 0 && <span className="match-used">Already used for {questionList(used)}</span>}
                <span className="match-title" id={`match-title-${match.scenarioId}`}>
                  {scenario!.title}
                </span>
                {scenario!.origin === "demo" && <span className="origin is-demo">Demo</span>}
                <span className="match-reason" id={`match-about-${match.scenarioId}`}>
                  {match.reason}
                </span>
                <span className="match-pick">{picked ? "✓ Picked" : "Tap to pick"}</span>
              </button>
            </li>
          );
        })}
      </ol>
      {staleNote}
    </div>
  );
}
