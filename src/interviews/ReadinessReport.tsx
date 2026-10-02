import { useId } from "react";
import { ProblemAlert } from "../model-gateway/ProblemAlert";
import { skillKey } from "../scenarios/skills";
import type { Interview, Question, StoredReadiness } from "./interview";
import { READINESS_TEXT } from "./readiness";
import { READINESS_PROBLEMS, type ReadinessRequest } from "./useReadinessReport";

/** How a skill comes across in the Answers to its Questions: the best of them, or not practised if none is answered. */
const SHOWN_TEXT = { yes: "shown", partly: "partly shown", no: "not shown" } as const;
const BEST_FIRST = ["yes", "partly", "no"] as const;

type Props = {
  interview: Interview;
  request: ReadinessRequest;
  accessActive: boolean;
  onBack: () => void;
  /** Shows a Question's card, by its index. */
  onGoTo: (index: number) => void;
  /** Writing a Scenario for a Gap's Question: co-writing, or the form without a token. */
  onWriteScenario: (question: Question) => void;
  onNeedToken: () => void;
};

/** The Readiness Report page (#56), in place of the deck: the latest report and asking for it again. Every word from
 * the model is plain text. */
export function ReadinessReport({ interview, request, accessActive, onBack, onGoTo, onWriteScenario, onNeedToken }: Props) {
  const saved = interview.readinessReport?.report;
  const { busy, problem, blockedBy, stale } = request;
  const why = useId();
  return (
    <div className="readiness-page">
      <div className="readiness-head">
        <h2 className="page-title">Readiness Report</h2>
        <button type="button" className="button-link" onClick={onBack}>
          Back to Questions
        </button>
      </div>
      {!saved && <p className="readiness-intro">A practice estimate of how ready you are for this Interview, from all your Answers together.</p>}
      {stale && <p className="feedback-stale">This report is on an earlier version of your Answers.</p>}
      <div className="actions">
        <button type="button" className="button-primary" disabled={blockedBy !== null || busy} aria-describedby={blockedBy ? why : undefined} onClick={() => void request.ask()}>
          {saved ? "Get it again" : "Get Readiness Report"}
        </button>
        {blockedBy && (
          <span id={why} className="form-hint">
            {blockedBy}
          </span>
        )}
      </div>
      {busy && (
        <p className="chat-waiting" role="status">
          Reading your Answers…
        </p>
      )}
      {problem && <ProblemAlert {...READINESS_PROBLEMS[problem]} onNeedToken={onNeedToken} onRetry={() => void request.ask()} />}
      {saved && <ReportBody report={saved} interview={interview} accessActive={accessActive} onGoTo={onGoTo} onWriteScenario={onWriteScenario} />}
    </div>
  );
}

function ReportBody({ report, interview, accessActive, onGoTo, onWriteScenario }: { report: StoredReadiness } & Pick<Props, "interview" | "accessActive" | "onGoTo" | "onWriteScenario">) {
  const { questions } = interview;
  const indexOf = (questionId: string) => questions.findIndex((q) => q.id === questionId);
  /** Items about Questions deleted since are left out. */
  const present = <T extends { questionId: string }>(items: T[]) => items.filter((item) => indexOf(item.questionId) >= 0);
  const number = (questionId: string) => indexOf(questionId) + 1;
  const level = READINESS_TEXT[report.readiness];
  const notPractised = report.notPractised.filter((id) => indexOf(id) >= 0);
  const noPick = report.noScenarioPicked.filter((id) => indexOf(id) >= 0);
  const strengths = present(report.strengths);
  const toWorkOn = present(report.toWorkOn);
  const notInScenario = present(report.notInScenario);

  return (
    <>
      <section className="card readiness" aria-label="Readiness">
        <p className="label-caps">Readiness</p>
        <p className={`readiness-level is-${report.readiness}`}>{level.name}</p>
        <p className="readiness-meaning">{level.meaning}</p>
        {report.capped && <p className="readiness-capped">Capped at Nearly there while {countOfNotPractised(notPractised.length)} practised yet.</p>}
        <p className="readiness-why">{report.why}</p>
        <p className="form-hint">A practice estimate from your Answers, not a hiring decision.</p>
      </section>

      <SkillsSection report={report} questions={questions} />

      {strengths.length > 0 && (
        <section className="card readiness-section" aria-labelledby="readiness-strengths">
          <h3 id="readiness-strengths" className="card-title">
            Strengths
          </h3>
          <ul className="readiness-list" aria-label="Strengths">
            {strengths.map((s, i) => (
              <li key={i}>
                <p>{s.point}</p>
                <p className="feedback-quote">
                  “{s.quote}” · Question {number(s.questionId)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(toWorkOn.length > 0 || notInScenario.length > 0 || noPick.length > 0) && (
        <section className="card readiness-section" aria-labelledby="readiness-work">
          <h3 id="readiness-work" className="card-title">
            To work on
          </h3>
          {toWorkOn.length > 0 && (
            <ul className="readiness-list" aria-label="To work on">
              {toWorkOn.map((t, i) => {
                const question = questions[indexOf(t.questionId)];
                const n = number(t.questionId);
                return (
                  <li key={i}>
                    <p>{t.point}</p>
                    {question.matchResult?.gap ? (
                      <button type="button" className="button-link" onClick={() => onWriteScenario(question)}>
                        {accessActive ? `Co-write a Scenario for Question ${n}` : `Write a Scenario for Question ${n}`}
                      </button>
                    ) : (
                      <button type="button" className="button-link" onClick={() => onGoTo(n - 1)}>
                        Go to Question {n}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {notInScenario.length > 0 && (
            <>
              <p className="label-caps feedback-heading">Not in your Scenarios</p>
              <ul className="feedback-claims" aria-label="Not in your Scenarios">
                {notInScenario.map((c, i) => (
                  <li key={i}>
                    “{c.quote}” · Question {number(c.questionId)}
                  </li>
                ))}
              </ul>
            </>
          )}
          {noPick.length > 0 && (
            <ul className="readiness-notes" aria-label="No Scenario picked">
              {noPick.map((id) => (
                <li key={id}>Pick a Scenario for Question {number(id)} so its claims can be checked.</li>
              ))}
            </ul>
          )}
        </section>
      )}

      {notPractised.length > 0 && (
        <section className="card readiness-section" aria-labelledby="readiness-not-practised">
          <h3 id="readiness-not-practised" className="card-title">
            Not practised
          </h3>
          <ul className="readiness-list" aria-label="Not practised">
            {notPractised.map((id) => (
              <li key={id}>
                <button type="button" className="button-link" onClick={() => onGoTo(indexOf(id))}>
                  Question {number(id)}
                </button>{" "}
                <span className="readiness-question">{questions[indexOf(id)].text}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

/** "1 Question isn't" or "3 Questions aren't". */
const countOfNotPractised = (n: number) => (n === 1 ? "1 Question isn't" : `${n} Questions aren't`);

/** Each skill the report's Questions test, with how it comes across, then the Questions without a skill. */
function SkillsSection({ report, questions }: { report: StoredReadiness; questions: Question[] }) {
  const rated = new Map(report.shows.map((s) => [s.questionId, s.shows]));
  const notJudged = new Set(report.notJudged);
  const inReport = questions.map((q, i) => ({ q, n: i + 1 })).filter(({ q }) => rated.has(q.id) || notJudged.has(q.id) || report.notPractised.includes(q.id));
  const bySkill = new Map<string, { skill: string; numbers: number[]; ratings: ("yes" | "partly" | "no")[]; unjudged: boolean }>();
  for (const { q, n } of inReport) {
    if (!q.skill) continue;
    const entry = bySkill.get(skillKey(q.skill)) ?? { skill: q.skill, numbers: [], ratings: [], unjudged: false };
    entry.numbers.push(n);
    const rating = rated.get(q.id);
    if (rating) entry.ratings.push(rating);
    if (notJudged.has(q.id)) entry.unjudged = true;
    bySkill.set(skillKey(q.skill), entry);
  }
  const others = inReport.filter(({ q }) => !q.skill);
  /** The best rating, else not judged (answered, but left out by the model), else not practised. */
  const shownAs = (ratings: ("yes" | "partly" | "no")[], unjudged: boolean) => {
    const best = BEST_FIRST.find((r) => ratings.includes(r));
    return best ? SHOWN_TEXT[best] : unjudged ? "not judged this time" : "not practised";
  };
  const unjudgedNumbers = inReport.filter(({ q }) => notJudged.has(q.id)).map(({ n }) => n);
  const refs = (numbers: number[]) => (numbers.length === 1 ? `Question ${numbers[0]}` : `Questions ${numbers.join(", ")}`);

  return (
    <section className="card readiness-section" aria-labelledby="readiness-skills">
      <h3 id="readiness-skills" className="card-title">
        Skills
      </h3>
      <ul className="readiness-skills" aria-label="Skills">
        {[...bySkill.values()].map(({ skill, numbers, ratings, unjudged }) => (
          <li key={skillKey(skill)} className={`is-${shownAs(ratings, unjudged).replace(/ /g, "-")}`}>
            {skill}: {shownAs(ratings, unjudged)} · {refs(numbers)}
          </li>
        ))}
      </ul>
      {others.length > 0 && (
        <>
          <p className="label-caps feedback-heading">Other Questions</p>
          <ul className="readiness-skills" aria-label="Other Questions">
            {others.map(({ q, n }) => (
              <li key={q.id} className={`is-${shownAs(rated.has(q.id) ? [rated.get(q.id)!] : [], notJudged.has(q.id)).replace(/ /g, "-")}`}>
                Question {n}: {shownAs(rated.has(q.id) ? [rated.get(q.id)!] : [], notJudged.has(q.id))}
              </li>
            ))}
          </ul>
        </>
      )}
      {unjudgedNumbers.length > 0 && (
        <p className="readiness-notes">
          {unjudgedNumbers.length === 1 ? `Question ${unjudgedNumbers[0]} wasn't` : `Questions ${unjudgedNumbers.join(", ")} weren't`} judged this time. Get it
          again to include {unjudgedNumbers.length === 1 ? "it" : "them"}.
        </p>
      )}
    </section>
  );
}
