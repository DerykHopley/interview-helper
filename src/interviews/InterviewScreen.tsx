import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useDismiss, useLatest } from "../hooks";
import type { Interview, Question } from "./interview";
import type { SavedInterview } from "./interviewStore";

type Props = {
  interview: SavedInterview;
  /** Saves a changed Interview; the screen then shows the saved version. */
  onChange: (interview: Interview) => Promise<void>;
  /** Which card is showing: a Question's index, or the number of Questions for the end card. */
  position: number;
  onMove: (position: number) => void;
};

const SWIPE_PX = 50;

/** True while the Candidate is typing, when the arrow keys must move the text cursor, not the deck. */
const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

/** The S3 Interview screen: one Question at a time on a deck, ending in a card for adding your own. Matches (#10),
 * asking for more (#9) and the answer bar (#31) join it later. */
export function InterviewScreen({ interview, onChange, position, onMove }: Props) {
  const { questions } = interview;
  const at = Math.min(position, questions.length);
  const go = (to: number) => onMove(Math.max(0, Math.min(to, questions.length)));
  const latestGo = useLatest((by: number) => go(at + by));
  const swipeFrom = useRef<number | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  // ← and → move through the deck, except while typing in a box.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target) || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === "ArrowLeft") latestGo.current(-1);
      if (e.key === "ArrowRight") latestGo.current(1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [latestGo]);

  async function remove(question: Question) {
    if (!confirm(`Delete this Question? This can't be undone.\n\n"${question.text}"`)) return;
    await save({ ...interview, questions: questions.filter((q) => q.id !== question.id) }, "Couldn't delete the Question. Try again.");
  }

  async function add(question: Question) {
    if (await save({ ...interview, questions: [...questions, question] }, "Couldn't add the Question. Try again.")) onMove(questions.length);
  }

  /** Saves, and says so if it failed (the Vault locked meanwhile, or storage is full). */
  async function save(next: Interview, onFailure: string) {
    setFailure(null);
    try {
      await onChange(next);
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
      onPointerDown={(e) => (swipeFrom.current = isTyping(e.target) ? null : e.clientX)}
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
        <QuestionCard question={questions[at]} n={at + 1} of={questions.length} onDelete={() => void remove(questions[at])} />
      ) : (
        <EndCard count={questions.length} onAdd={add} />
      )}
      <button type="button" className="deck-arrow is-next" aria-label="Next Question" disabled={at === questions.length} onClick={() => go(at + 1)}>
        ›
      </button>
    </div>
  );
}

function QuestionCard({ question, n, of, onDelete }: { question: Question; n: number; of: number; onDelete: () => void }) {
  return (
    <article className="question-card" aria-label={`Question ${n} of ${of}`}>
      <CardMenu onDelete={onDelete} />
      <p className="label-caps question-skill">
        {question.skill ?? "No skill given"}
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
  const title = count === 0 ? "No Questions yet" : `That's all ${count} ${count === 1 ? "Question" : "Questions"}`;

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

/** The ⋯ menu on a Question card. #10 adds "Re-run matching". */
function CardMenu({ onDelete }: { onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useDismiss(open, root, () => setOpen(false));
  return (
    <div className="card-menu" ref={root}>
      <button type="button" className="card-menu-button" aria-label="More for this Question" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        ⋯
      </button>
      {open && (
        <div className="card-menu-list" role="menu" aria-label="This Question">
          <button
            type="button"
            role="menuitem"
            className="jump-item"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
          >
            Delete this Question
          </button>
        </div>
      )}
    </div>
  );
}
