import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useLatest } from "../hooks";
import { MatchesPanel } from "../matching/MatchesPanel";
import { useQuestionMatches } from "../matching/useQuestionMatches";
import type { UnlockedVault } from "../vault/vault";
import { NO_SKILL } from "./gaps";
import { PopupMenu } from "../PopupMenu";
import { countOf } from "../text";
import type { Interview, Question } from "./interview";
import type { SavedInterview } from "./interviewStore";

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
  /** Starts a new Scenario tagged with this skill (a Gap's "Write a Scenario for this"). #13 makes it co-writing. */
  onWriteScenario: (skill: string | undefined) => void;
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
 * your own. Asking for more (#9) and the answer bar (#31) join it later. */
export function InterviewScreen({ interview, onChange, position, onMove, vault, onNeedToken, onOpenScenarioBank, onWriteScenario }: Props) {
  const { questions } = interview;
  const matches = useQuestionMatches(vault, onChange);
  const at = Math.min(position, questions.length);
  const go = (to: number) => onMove(Math.max(0, Math.min(to, questions.length)));
  const latestGo = useLatest((by: number) => go(at + by));
  const swipeFrom = useRef<number | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  // ← and → move through the deck, except while typing in a box.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target) || menuOpen() || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === "ArrowLeft") latestGo.current(-1);
      if (e.key === "ArrowRight") latestGo.current(1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [latestGo]);

  async function remove(question: Question) {
    if (!confirm(`Delete this Question? This can't be undone.\n\n"${question.text}"`)) return;
    const index = questions.indexOf(question);
    if (!(await save((current) => ({ ...current, questions: current.questions.filter((q) => q.id !== question.id) }), "Couldn't delete the Question. Try again."))) return;
    if (index > 0 && index === questions.length - 1) onMove(index - 1); // the last one: show the one before it
  }

  async function add(question: Question) {
    if (await save((current) => ({ ...current, questions: [...current.questions, question] }), "Couldn't add the Question. Try again.")) onMove(questions.length);
  }

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

  return (
    <div
      className="deck"
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
      {failure && (
        <p role="alert" className="notice-warn deck-failure">
          {failure}
        </p>
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
          <DealtMatches
            question={questions[at]}
            matches={matches}
            onNeedToken={onNeedToken}
            onOpenScenarioBank={onOpenScenarioBank}
            onWriteScenario={() => onWriteScenario(questions[at].skill)}
          />
        </div>
      ) : (
        <EndCard count={questions.length} onAdd={add} />
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
      <CardMenu onDelete={onDelete} onRematch={onRematch} />
      <p className="label-caps question-skill">
        {question.skill ?? NO_SKILL}
        {question.origin === "typed" && <span className="question-origin"> · typed by you</span>}
      </p>
      <p className="question-text">{question.text}</p>
    </article>
  );
}

/** The end of the deck: how many Questions there are, and a box to add your own. */
function EndCard({ count, onAdd }: { count: number; onAdd: (question: Question) => Promise<void> }) {
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
function DealtMatches({ question, matches, onNeedToken, onOpenScenarioBank, onWriteScenario }: {
  question: Question;
  matches: ReturnType<typeof useQuestionMatches>;
  onNeedToken: () => void;
  onOpenScenarioBank: () => void;
  onWriteScenario: () => void;
}) {
  const { dealt, finding, problem } = matches.stateOf(question.id);
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
          stale={matches.isStale(question)}
          skill={question.skill}
          scenarios={matches.scenarios}
          onRetry={() => matches.match(question)}
          onNeedToken={onNeedToken}
          onOpenScenarioBank={onOpenScenarioBank}
          onWriteScenario={onWriteScenario}
        />
      )}
    </>
  );
}
