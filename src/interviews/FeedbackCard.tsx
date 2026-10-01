import type { StoredChecklist } from "./interview";
import type { FeedbackStaleness } from "./useAnswerFeedback";

const STAR_PARTS = [
  ["situation", "Situation"],
  ["task", "Task"],
  ["action", "Action"],
  ["result", "Result"],
] as const;

/** What's said when the Feedback is no longer about what's on screen. */
const STALE_TEXT: Record<Exclude<FeedbackStaleness, "current">, string> = {
  answer: "This Feedback is on an earlier version of your answer.",
  "other-scenario": "This Feedback is on a different Scenario than the one you've picked.",
  "edited-scenario": "This Feedback is on an earlier version of your Scenario.",
};

type Props = {
  checklist: StoredChecklist;
  /** The skill the Question tests, if it has one. */
  skill?: string;
  staleness: FeedbackStaleness;
};

/** Feedback on an Answer (#32), as a fixed checklist, shown in the deck between the Matches and the answer bar. Every
 * word from the model is plain text. */
export function FeedbackCard({ checklist, skill, staleness }: Props) {
  const { star, measurableResult, notInScenario, skill: skillCheck } = checklist;
  return (
    <section className="card feedback" aria-label="Feedback">
      <h3 className="card-title">Feedback</h3>
      {staleness !== "current" && <p className="feedback-stale">{STALE_TEXT[staleness]}</p>}
      <ul className="feedback-parts">
        {STAR_PARTS.map(([key, name]) => (
          <li key={key} className={star[key] === "said" ? "is-said" : "is-missing"}>
            {star[key] === "said" ? `✓ ${name}` : `${name}: not said yet`}
          </li>
        ))}
        <li className={measurableResult === "said" ? "is-said" : "is-missing"}>
          {measurableResult === "said" ? "✓ Measurable result" : "Measurable result: not said yet"}
        </li>
      </ul>
      {notInScenario.length === 0 ? (
        <p className="feedback-ok">✓ Everything you said is in your Scenario</p>
      ) : (
        <>
          <p className="label-caps feedback-heading">Not in your Scenario</p>
          <ul className="feedback-claims" aria-label="Not in your Scenario">
            {notInScenario.map((claim, i) => (
              <li key={i}>
                <span className="feedback-quote">“{claim.quote}”</span>
                {claim.scenarioSays && <span className="feedback-says">Your Scenario says: “{claim.scenarioSays}”</span>}
              </li>
            ))}
          </ul>
        </>
      )}
      {skillCheck ? (
        <>
          <p className="label-caps feedback-heading">{`The skill (${skill}): ${skillCheck.addressed}`}</p>
          <p className="feedback-why">{skillCheck.why}</p>
        </>
      ) : (
        <p className="feedback-why">No skill given for this Question</p>
      )}
    </section>
  );
}
