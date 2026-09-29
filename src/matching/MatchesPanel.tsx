import type { Matching } from "../interviews/interview";
import type { SavedScenario } from "../scenarios/scenarioBank";

/** Why Matches couldn't be found just now. */
export type MatchProblem = "no-token" | "expired-token" | "no-scenarios" | "unreachable" | "failed";

type Props = {
  finding: boolean;
  problem: MatchProblem | null;
  matching: Matching | undefined;
  skill: string | undefined;
  /** The Candidate's Scenarios, to show each Match's title and demo label; null until they've been read. */
  scenarios: SavedScenario[] | null;
  onRetry: () => void;
  onNeedToken: () => void;
  onOpenScenarioBank: () => void;
  onWriteScenario: () => void;
};

const PROBLEM: Record<MatchProblem, string> = {
  "no-token": "Matches can't be found without an Access Token.",
  "expired-token": "Matches can't be found — your Access Token has expired.",
  "no-scenarios": "You have no Scenarios to match yet.",
  unreachable: "Couldn't reach the app's server. Check your connection and try again.",
  failed: "Finding Matches didn't work this time.",
};

/** What's dealt below a Question card (S3): finding placeholders, the fanned Matches, or the Gap card. */
export function MatchesPanel({ finding, problem, matching, skill, scenarios, onRetry, onNeedToken, onOpenScenarioBank, onWriteScenario }: Props) {
  if (finding || (matching && !matching.gap && scenarios === null)) {
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
    return (
      <div className="matches" role="alert">
        <p className="notice-warn">{PROBLEM[problem]}</p>
        {(problem === "no-token" || problem === "expired-token") && (
          <button type="button" className="button-secondary" onClick={onNeedToken}>
            Enter a new token
          </button>
        )}
        {problem === "no-scenarios" && (
          <button type="button" className="button-secondary" onClick={onOpenScenarioBank}>
            Open Scenario Bank
          </button>
        )}
        {(problem === "unreachable" || problem === "failed") && (
          <button type="button" className="button-secondary" onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    );
  }
  if (!matching) return null;
  if (matching.gap) {
    return (
      <section className="matches gap-card" aria-labelledby="gap-title">
        <p className="label-caps gap-label">Gap · {skill ?? "no skill given"}</p>
        <h3 id="gap-title" className="gap-title">
          No Scenario fits this Question yet
        </h3>
        {matching.suggestion && <p className="gap-suggestion">{matching.suggestion}</p>}
        <div className="actions">
          <button type="button" className="button-primary" onClick={onWriteScenario}>
            Write a Scenario for this
          </button>
          <button type="button" className="button-link" onClick={onRetry}>
            Re-run matching
          </button>
        </div>
      </section>
    );
  }
  const shown = matching.matches
    .map((match) => ({ match, scenario: scenarios?.find((s) => s.id === match.scenarioId) }))
    .filter((m) => m.scenario); // a Scenario deleted since matching isn't shown
  return (
    <div className="matches">
      <ol className="match-fan" aria-label="Matches">
        {shown.map(({ match, scenario }, i) => (
          <li key={match.scenarioId} className={`match-card${i === 0 ? " is-best" : ""}`}>
            <p className="label-caps match-rank">
              {i === 0 ? "Best fit" : `#${i + 1}`} · {Math.round(match.score)}%
            </p>
            <p className="match-title">{scenario!.title}</p>
            {scenario!.origin === "demo" && <span className="origin is-demo">Demo</span>}
            <p className="match-reason">{match.reason}</p>
          </li>
        ))}
      </ol>
      {shown.length < matching.matches.length && (
        <p className="matches-status">
          Some Matches were Scenarios you've since deleted.{" "}
          <button type="button" className="button-link" onClick={onRetry}>
            Re-run matching
          </button>
        </p>
      )}
    </div>
  );
}
