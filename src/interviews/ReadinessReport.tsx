import { useId } from "react";
import { ProblemAlert } from "../model-gateway/ProblemAlert";
import { skillKey } from "../scenarios/skills";
import { countOf, wordFor } from "../text";
import type { Interview, Question, StoredReadiness } from "./interview";
import { READINESS_TEXT, skillLines, STANDING_TEXT } from "./readiness";
import { READINESS_PROBLEMS, type ReadinessRequest } from "./useReadinessReport";

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

/** A saved report's sections, numbered as the Questions are now. */
function ReportBody({ report, interview, accessActive, onGoTo, onWriteScenario }: { report: StoredReadiness } & Pick<Props, "interview" | "accessActive" | "onGoTo" | "onWriteScenario">) {
  const { questions } = interview;
  const indexOf = (questionId: string) => questions.findIndex((q) => q.id === questionId);
  // Items about Questions deleted since are left out.
  const isPresent = (questionId: string) => indexOf(questionId) >= 0;
  const present = <T extends { questionId: string }>(items: T[]) => items.filter((item) => isPresent(item.questionId));
  const number = (questionId: string) => indexOf(questionId) + 1;
  const level = READINESS_TEXT[report.readiness];
  const notPractised = report.notPractised.filter(isPresent);
  const noPick = report.noScenarioPicked.filter(isPresent);
  const strengths = present(report.strengths);
  const toWorkOn = present(report.toWorkOn);
  const notInScenario = present(report.notInScenario);

  return (
    <>
      <section className="card readiness" aria-label="Readiness">
        <p className="label-caps">Readiness</p>
        <p className={`readiness-level is-${report.readiness}`}>{level.name}</p>
        <p className="readiness-meaning">{level.meaning}</p>
        {report.capped && (
          <p className="readiness-capped">
            Capped at Nearly there while {countOf(notPractised.length, "Question")} {notPractised.length === 1 ? "isn't" : "aren't"} practised yet.
          </p>
        )}
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

/** "Question 3", or "Questions 3, 5". */
const questionRefs = (numbers: number[]) => `${wordFor(numbers.length, "Question")} ${numbers.join(", ")}`;

/** Each skill the report's Questions test, with how it comes across (and each Question's, when it has several), then
 * the Questions without a skill. */
function SkillsSection({ report, questions }: { report: StoredReadiness; questions: Question[] }) {
  const { skills, others } = skillLines(report, questions);
  const unjudged = [...skills.flatMap((line) => line.questions), ...others].filter((q) => q.standing === "not-judged").map((q) => q.n);
  return (
    <section className="card readiness-section" aria-labelledby="readiness-skills">
      <h3 id="readiness-skills" className="card-title">
        Skills
      </h3>
      <ul className="readiness-skills" aria-label="Skills">
        {skills.map(({ skill, standing, questions: asked }) => (
          <li key={skillKey(skill)} className={`is-${standing}`}>
            {skill}: {STANDING_TEXT[standing]} ·{" "}
            {asked.length === 1 ? `Question ${asked[0].n}` : asked.map((q) => `Question ${q.n}: ${STANDING_TEXT[q.standing]}`).join(", ")}
          </li>
        ))}
      </ul>
      {others.length > 0 && (
        <>
          <p className="label-caps feedback-heading">Other Questions</p>
          <ul className="readiness-skills" aria-label="Other Questions">
            {others.map(({ n, standing }) => (
              <li key={n} className={`is-${standing}`}>
                Question {n}: {STANDING_TEXT[standing]}
              </li>
            ))}
          </ul>
        </>
      )}
      {unjudged.length > 0 && (
        <p className="readiness-notes">
          {questionRefs(unjudged)} {unjudged.length === 1 ? "wasn't" : "weren't"} judged this time. Get it again to include {unjudged.length === 1 ? "it" : "them"}.
        </p>
      )}
    </section>
  );
}
