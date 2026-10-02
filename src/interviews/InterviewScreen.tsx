import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useLatest } from "../hooks";
import { MatchesPanel } from "../matching/MatchesPanel";
import { useQuestionMatches } from "../matching/useQuestionMatches";
import { SHARED_PROBLEM_TEXT } from "../model-gateway/callProblems";
import { ProblemAlert } from "../model-gateway/ProblemAlert";
import type { UnlockedVault } from "../vault/vault";
import { NO_SKILL } from "./gaps";
import { PopupMenu } from "../PopupMenu";
import { countOf } from "../text";
import { AnswerBar, type OnSaveNow } from "./AnswerBar";
import { withSpoken } from "./answers";
import { FeedbackCard } from "./FeedbackCard";
import { usedFor } from "./picks";
import type { Interview, Question } from "./interview";
import type { SavedInterview } from "./interviewStore";
import { FIRST_BATCH, MORE_BATCH, type Batch } from "./questionGenerator";
import { ReadinessReport } from "./ReadinessReport";
import { useReadinessReport } from "./useReadinessReport";
import { FEEDBACK_PROBLEMS, useAnswerFeedback, type FeedbackRequest, type FeedbackStaleness } from "./useAnswerFeedback";
import type { Writing, WriteProblem } from "./useQuestionWriting";

type Props = {
  interview: SavedInterview;
  /** Changes the Interview, given its latest saved version; the screen then shows the result. */
  onChange: (change: (current: Interview) => Interview) => Promise<void>;
  /** Which card is showing: a Question's index, or the number of Questions for the end card. */
  position: number;
  onMove: (position: number) => void;
  vault: UnlockedVault;
  /** Opens the Access Token panel, e.g. when matching needs a new token. */
  onNeedToken: () => void;
  onOpenScenarioBank: () => void;
  /** A Gap's "Write a Scenario for this": co-writing from its Question (#13), or the form without a token. */
  onWriteScenario: (question: Question) => void;
  /** A Question whose Matches are dealt as the screen opens (back from its Gap). */
  dealtOnOpen?: string | null;
  /** Given a way to save the answer being typed now (the Lock button uses it). */
  onAnswerSaveNow?: OnSaveNow;
  /** Whether this Interview's Questions are being written, or why they last couldn't be (#9). */
  writing: Writing;
  /** Whether an Access Token is active, so Questions can be written. */
  accessActive: boolean;
  /** A model call found the Access Token expired. */
  onTokenExpired: () => void;
  /** Writes a batch of Questions, added to the end. */
  onWrite: (batch: Batch) => void;
  /** Whether the Readiness Report page shows in place of the deck (#56), and showing or leaving it. */
  reportOpen: boolean;
  onReportOpen: (open: boolean) => void;
};

/** What each problem writing Questions says, and whether its fix is a new Access Token (otherwise: try again). */
const WRITE_PROBLEMS: Record<WriteProblem, { text: string; needsToken?: boolean }> = {
  "no-token": { text: "Questions can't be written without an Access Token.", needsToken: true },
  "expired-token": { text: "Questions can't be written — your Access Token has expired.", needsToken: true },
  unreachable: { text: SHARED_PROBLEM_TEXT.unreachable },
  "cut-off": { text: SHARED_PROBLEM_TEXT["cut-off"] },
  failed: { text: "Your Questions couldn't be written this time. Try again." },
  "not-saved": { text: "Couldn't save the new Questions. Try again." },
  "no-job-spec": { text: "This Interview has no Job Spec to write Questions from. Type your own instead." },
};


const SWIPE_PX = 50;

/** Whether a pop-up menu is open: then ← → belong to it, not the deck. */
const menuOpen = () => document.querySelector('[role="menu"]') !== null;

/** Controls a swipe mustn't start on: pressing them is a tap, not the start of a swipe. */
const isControl = (target: EventTarget | null) => target instanceof Element && target.closest("button, a, input, textarea, select, [role=menu]") !== null;

/** True while the Candidate is typing, when the arrow keys must move the text cursor, not the deck. */
const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

/** The S3 Interview screen: one Question at a time on a deck, each dealing its Matches, ending in a card for adding
 * your own or asking for more. The answer bar (#31) joins it later. */
export function InterviewScreen({
  interview,
  onChange,
  position,
  onMove,
  vault,
  onNeedToken,
  onOpenScenarioBank,
  onWriteScenario,
  dealtOnOpen = null,
  onAnswerSaveNow,
  writing,
  accessActive,
  onTokenExpired,
  onWrite,
  reportOpen,
  onReportOpen,
}: Props) {
  const { questions } = interview;
  const matches = useQuestionMatches(vault, onChange, onTokenExpired, dealtOnOpen);
  const feedback = useAnswerFeedback({ onChange, onTokenExpired, accessActive, scenarios: matches.scenarios });
  const readiness = useReadinessReport({ interview, onChange, onTokenExpired, accessActive, scenarios: matches.scenarios });
  const latestReportOpen = useLatest(reportOpen);
  const at = Math.min(position, questions.length);
  const go = (to: number) => onMove(Math.max(0, Math.min(to, questions.length)));
  const latestGo = useLatest((by: number) => go(at + by));
  const swipeFrom = useRef<number | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  // Written Questions arriving are announced until the Candidate moves on, adjusting state while rendering (React's
  // way). If the end card was showing, the deck moves to the first new one (below), so that's where it's said.
  const [seenCount, setSeenCount] = useState(questions.length);
  const [announced, setAnnounced] = useState<{ count: number; at: number; atEnd: boolean } | null>(null);
  if (questions.length !== seenCount) {
    setSeenCount(questions.length);
    const added = questions.slice(seenCount);
    if (added.length > 0 && added.every((q) => q.origin === "generated")) {
      const jumps = at === seenCount;
      setAnnounced({ count: added.length, at: jumps ? seenCount : at, atEnd: !jumps });
    }
  }
  if (announced && announced.at !== at) setAnnounced(null);

  // When Questions arrive while the end card is showing, show the first new one.
  const shownCount = useRef(questions.length);
  useEffect(() => {
    if (questions.length > shownCount.current && at === shownCount.current) onMove(shownCount.current);
    shownCount.current = questions.length;
  }, [questions.length, at, onMove]);

  // ← and → move through the deck, except while typing in a box.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target) || menuOpen() || latestReportOpen.current || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === "ArrowLeft") latestGo.current(-1);
      if (e.key === "ArrowRight") latestGo.current(1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [latestGo, latestReportOpen]);

  async function remove(question: Question) {
    if (!confirm(`Delete this Question? This can't be undone.\n\n"${question.text}"`)) return;
    const index = questions.indexOf(question);
    if (!(await save((current) => ({ ...current, questions: current.questions.filter((q) => q.id !== question.id) }), "Couldn't delete the Question. Try again."))) return;
    if (index > 0 && index === questions.length - 1) onMove(index - 1); // the last one: show the one before it
  }

  async function add(question: Question) {
    if (await save((current) => ({ ...current, questions: [...current.questions, question] }), "Couldn't add the Question. Try again.")) onMove(questions.length);
  }

  /** Adds what was said to a Question's saved Answer, when the Candidate left its card mid-recording (#33). If the app
   * has locked meanwhile it can't be saved, and is let go: nothing is on screen to report it. */
  const addSpoken = (questionId: string, spoken: string) =>
    void onChange((current) => {
      const savedAt = new Date().toISOString();
      return {
        ...current,
        questions: current.questions.map((q) => (q.id === questionId ? { ...q, answer: { ...q.answer, text: withSpoken(q.answer?.text ?? "", spoken), savedAt } } : q)),
        lastPractisedAt: savedAt,
      };
    }).catch(() => {});

  /** Picks a Scenario for the Question from its Matches, or un-picks (null). */
  const pick = (questionId: string, scenarioId: string | null) =>
    save(
      (current) => ({ ...current, questions: current.questions.map((q) => (q.id === questionId ? { ...q, pickedScenarioId: scenarioId ?? undefined } : q)) }),
      "Couldn't save your pick. Try again.",
    );

  /** Saves the Answer on its Question (the answer bar says whether it worked); empty text clears it. */
  const saveAnswer = (questionId: string, text: string) =>
    onChange((current) => {
      const savedAt = new Date().toISOString();
      // The Feedback stays with an edited Answer, and shows it's on an earlier version.
      const answer = text.trim() ? { ...current.questions.find((q) => q.id === questionId)?.answer, text, savedAt } : undefined;
      return {
        ...current,
        questions: current.questions.map((q) => (q.id === questionId ? { ...q, answer } : q)),
        lastPractisedAt: answer ? savedAt : current.lastPractisedAt,
      };
    });

  /** Saves a change, and says so if it failed (the Vault locked meanwhile, or storage is full). */
  async function save(change: (current: Interview) => Interview, onFailure: string) {
    setFailure(null);
    try {
      await onChange(change);
      return true;
    } catch {
      setFailure(onFailure);
      return false;
    }
  }

  if (reportOpen) {
    return (
      <ReadinessReport
        interview={interview}
        request={readiness}
        accessActive={accessActive}
        onBack={() => onReportOpen(false)}
        onGoTo={(index) => {
          onReportOpen(false);
          onMove(index);
        }}
        onWriteScenario={onWriteScenario}
        onNeedToken={onNeedToken}
      />
    );
  }

  return (
    <div
      className={failure || announced || writing.problem ? "deck has-notices" : "deck"}
      role="group"
      aria-label="Question deck"
      // Swipes are for touch; a mouse drag selects text instead.
      onPointerDown={(e) => (swipeFrom.current = e.pointerType !== "mouse" && !isControl(e.target) ? e.clientX : null)}
      onPointerCancel={() => (swipeFrom.current = null)}
      onPointerUp={(e) => {
        if (swipeFrom.current === null) return;
        const dx = e.clientX - swipeFrom.current;
        swipeFrom.current = null;
        if (dx <= -SWIPE_PX) go(at + 1);
        if (dx >= SWIPE_PX) go(at - 1);
      }}
    >
      {(failure || announced || writing.problem) && (
        <div className="deck-notices">
          {failure && (
            <p role="alert" className="notice-warn">
              {failure}
            </p>
          )}
          {announced && (
            <p role="status" className="notice-info">
              {countOf(announced.count, "new Question")} added{announced.atEnd ? " at the end of the deck" : ""}
            </p>
          )}
          {writing.problem && <WriteProblemNotice problem={writing.problem} onNeedToken={onNeedToken} />}
        </div>
      )}
      <button type="button" className="deck-arrow is-previous" aria-label="Previous Question" disabled={at === 0} onClick={() => go(at - 1)}>
        ‹
      </button>
      {at < questions.length ? (
        <div className="deck-question">
          <QuestionCard
            question={questions[at]}
            n={at + 1}
            of={questions.length}
            onDelete={() => void remove(questions[at])}
            onRematch={() => matches.match(questions[at])}
          />
          <AnswerBar
            key={questions[at].id}
            question={questions[at]}
            using={matches.scenarios?.find((s) => s.id === questions[at].pickedScenarioId)?.title}
            onSave={(text) => saveAnswer(questions[at].id, text)}
            onSpokenAfterLeaving={(spoken) => addSpoken(questions[at].id, spoken)}
            onSaveNow={onAnswerSaveNow}
            feedback={{
              blockedBy: (text) => feedback.blockedBy(questions[at], text),
              busy: feedback.requestOf(questions[at].id)?.busy ?? false,
              again: Boolean(questions[at].answer?.feedback),
              onAsk: (text) => void feedback.ask(questions[at], text),
            }}
          />
          <DealtMatches
            question={questions[at]}
            matches={matches}
            onNeedToken={onNeedToken}
            onOpenScenarioBank={onOpenScenarioBank}
            onWriteScenario={() => onWriteScenario(questions[at])}
            onPick={(scenarioId) => void pick(questions[at].id, scenarioId)}
            usedFor={(scenarioId) => usedFor(interview, scenarioId, questions[at].id)}
          />
          {/* Between the Matches and the fixed answer bar, in reading order (#32). */}
          <FeedbackArea
            question={questions[at]}
            request={feedback.requestOf(questions[at].id)}
            staleness={feedback.staleness(questions[at])}
            onRetry={(text) => void feedback.ask(questions[at], text)}
            onNeedToken={onNeedToken}
          />
        </div>
      ) : writing.active && questions.length === 0 ? (
        <WritingCard />
      ) : (
        <EndCard
          count={questions.length}
          onAdd={add}
          busy={writing.active}
          accessActive={accessActive}
          onWrite={interview.jobSpec ? onWrite : null}
          report={{
            blockedBy: readiness.blockedBy,
            onGet: () => {
              onReportOpen(true);
              void readiness.ask();
            },
          }}
        />
      )}
      <button type="button" className="deck-arrow is-next" aria-label="Next Question" disabled={at === questions.length} onClick={() => go(at + 1)}>
        ›
      </button>
    </div>
  );
}

function QuestionCard({ question, n, of, onDelete, onRematch }: { question: Question; n: number; of: number; onDelete: () => void; onRematch: () => void }) {
  return (
    <article className="question-card" aria-label={`Question ${n} of ${of}`}>
      <p className="question-position" aria-hidden="true">
        {n}/{of}
      </p>
      <CardMenu onDelete={onDelete} onRematch={onRematch} />
      <p className="label-caps question-skill">
        {question.skill ?? NO_SKILL}
        {question.origin === "typed" && <span className="question-origin"> · typed by you</span>}
      </p>
      <p className="question-text">{question.text}</p>
    </article>
  );
}

/** Why Questions couldn't be written, and the fix when it's a new Access Token (otherwise the end card's button). */
function WriteProblemNotice({ problem, onNeedToken }: { problem: WriteProblem; onNeedToken: () => void }) {
  const { text, needsToken } = WRITE_PROBLEMS[problem];
  return (
    <div role="alert" className="notice-warn">
      <p>{text}</p>
      {needsToken && (
        <button type="button" className="button-secondary" onClick={onNeedToken}>
          Enter a new token
        </button>
      )}
    </div>
  );
}

/** A new Interview's first Questions being written: placeholder lines until they arrive. */
function WritingCard() {
  return (
    <section className="question-card end-card is-writing" aria-busy="true" aria-labelledby="writing-title">
      <p className="label-caps question-skill">New Interview</p>
      <h2 id="writing-title" className="end-card-title">
        Writing your Questions…
      </h2>
      <span className="placeholder-line" aria-hidden="true" />
      <span className="placeholder-line is-short" aria-hidden="true" />
      <span className="placeholder-line" aria-hidden="true" />
    </section>
  );
}

type EndCardProps = {
  count: number;
  onAdd: (question: Question) => Promise<void>;
  /** Whether Questions are being written now. */
  busy: boolean;
  accessActive: boolean;
  /** Null when there's no Job Spec to write Questions from (a Pack's Interview without one). */
  onWrite: ((batch: Batch) => void) | null;
  /** Getting the Readiness Report (#56): why it can't be had yet, or null, and asking for it. */
  report: { blockedBy: string | null; onGet: () => void };
};

/** The end of the deck: how many Questions there are, the Readiness Report, asking for more (or the first ones), and
 * a box to add your own. */
function EndCard({ count, onAdd, busy, accessActive, onWrite, report }: EndCardProps) {
  const id = useId();
  const [text, setText] = useState("");
  const [skill, setSkill] = useState("");
  const [saving, setSaving] = useState(false);
  const title = count === 0 ? "No Questions yet" : `That's all ${countOf(count, "Question")}`;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!text.trim() || saving) return;
    setSaving(true);
    try {
      await onAdd({ id: crypto.randomUUID(), text: text.trim(), skill: skill.trim() || undefined, origin: "typed" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="question-card end-card" aria-labelledby={`${id}-title`}>
      <p className="label-caps question-skill">End of the deck</p>
      <h2 id={`${id}-title`} className="end-card-title">
        {title}
      </h2>
      {count > 0 && (
        <div className="actions">
          <button type="button" className="button-primary" disabled={report.blockedBy !== null} aria-describedby={report.blockedBy ? `${id}-report-why` : undefined} onClick={report.onGet}>
            Get Readiness Report
          </button>
          {report.blockedBy && (
            <span id={`${id}-report-why`} className="form-hint">
              {report.blockedBy}
            </span>
          )}
        </div>
      )}
      {onWrite && (
        <div className="actions">
          <button type="button" className="button-secondary" disabled={!accessActive || busy} onClick={() => onWrite(count === 0 ? FIRST_BATCH : MORE_BATCH)}>
            {busy ? "Writing more Questions…" : count === 0 ? `Write ~${FIRST_BATCH.ask} Questions` : `Ask for ${MORE_BATCH.ask} more Questions`}
          </button>
          {!accessActive && <span className="form-hint">Needs an active Access Token</span>}
        </div>
      )}
      <form className="form" onSubmit={(e) => void submit(e)}>
        <p className="label-caps question-skill">{count === 0 ? "Add your first" : "Or add your own"}</p>
        <label htmlFor={`${id}-text`} className="visually-hidden">
          Your Question
        </label>
        <textarea
          id={`${id}-text`}
          className="field"
          rows={2}
          placeholder="Type a Question you've been asked, or expect"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <label htmlFor={`${id}-skill`} className="form-label">
          Skill it tests (optional)
        </label>
        <input id={`${id}-skill`} className="field" placeholder="e.g. conflict" value={skill} onChange={(e) => setSkill(e.target.value)} />
        <button type="submit" className="button-primary" disabled={!text.trim() || saving}>
          Add Question
        </button>
      </form>
    </section>
  );
}

/** The ⋯ menu on a Question card. */
function CardMenu({ onDelete, onRematch }: { onDelete: () => void; onRematch: () => void }) {
  return (
    <PopupMenu
      label="This Question"
      className="card-menu"
      trigger={{ text: "⋯", ariaLabel: "More for this Question", className: "card-menu-button" }}
      items={[
        { key: "rematch", label: "Re-run matching", onSelect: onRematch },
        { key: "delete", label: "Delete this Question", onSelect: onDelete },
      ]}
    />
  );
}

/** The deal button under a Question card, and what it deals. */
function DealtMatches({ question, matches, onNeedToken, onOpenScenarioBank, onWriteScenario, onPick, usedFor }: {
  question: Question;
  matches: ReturnType<typeof useQuestionMatches>;
  onNeedToken: () => void;
  onOpenScenarioBank: () => void;
  onWriteScenario: () => void;
  onPick: (scenarioId: string | null) => void;
  usedFor: (scenarioId: string) => number[];
}) {
  const { dealt, finding, problem, droppedPick } = matches.stateOf(question.id);
  return (
    <>
      {!finding && (
        <button type="button" className="button-deal" onClick={() => matches.deal(question)}>
          {dealt ? "Hide my Matches" : question.matchResult ? "Deal my Matches" : "Find my Matches"}
        </button>
      )}
      {dealt && (
        <MatchesPanel
          finding={finding}
          problem={problem}
          matchResult={question.matchResult}
          stale={matches.staleness(question)}
          skill={question.skill}
          scenarios={matches.scenarios}
          onRetry={() => matches.match(question)}
          onNeedToken={onNeedToken}
          onOpenScenarioBank={onOpenScenarioBank}
          onWriteScenario={onWriteScenario}
          picking={{
            pickedScenarioId: question.pickedScenarioId,
            onPick: (scenarioId) => {
              matches.clearDroppedPick(question.id);
              onPick(scenarioId);
            },
            usedFor,
            droppedPick,
          }}
        />
      )}
    </>
  );
}

/** Under the Matches: the Answer's latest Feedback (marked out of date once the Answer or its Scenario has changed),
 * or why asking for it didn't work, with Try again. */
function FeedbackArea({ question, request, staleness, onRetry, onNeedToken }: {
  question: Question;
  request: FeedbackRequest | undefined;
  staleness: FeedbackStaleness;
  onRetry: (text: string) => void;
  onNeedToken: () => void;
}) {
  const saved = question.answer?.feedback;
  return (
    <>
      {request?.problem && <ProblemAlert {...FEEDBACK_PROBLEMS[request.problem]} onNeedToken={onNeedToken} onRetry={() => onRetry(request.text)} />}
      {saved && <FeedbackCard checklist={saved.checklist} skill={question.skill} staleness={staleness} />}
    </>
  );
}
