// PROTOTYPE — round 14: pieces for the Interview view's missing states (issues #8, #9, #10, #13):
// a menu on each Question card, adding your own Question, asking for more, the Questions list, and the
// "writing your Questions" card for a new Interview.
import { useEffect, useState } from "react";
import type { SlotProps } from "./FlashcardShell";
import { GENERATING, TOKEN_EXPIRED, addQuestion, askForMore, canAskForMore, deleteQuestion, finishGenerating, questions, rerunMatching } from "./data";

/** ⋯ in the Question card's corner: Re-run matching, Delete this Question. */
export function CardMenu({ q, flip }: SlotProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="vs-menu" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
      <button className="vs-menu-btn" onClick={() => setOpen((o) => !o)} aria-label="Question options" aria-expanded={open}>⋯</button>
      {open && (
        <div className="vs-menu-list" role="menu">
          <button role="menuitem" disabled={TOKEN_EXPIRED || !!q.unmatched} onClick={() => { setOpen(false); rerunMatching(q.id); flip(); }}>
            Re-run matching{TOKEN_EXPIRED && <span> — needs an Access Token</span>}
          </button>
          <button role="menuitem" className="is-danger" onClick={() => { setOpen(false); if (confirm(`Delete this Question?\n\n“${q.text}”`)) deleteQuestion(q.id); }}>Delete this Question</button>
        </div>
      )}
    </div>
  );
}

/** Type your own Question (#8). */
export function AddQuestionForm({ onAdded, compact }: { onAdded: (index: number) => void; compact?: boolean }) {
  const [text, setText] = useState("");
  return (
    <form className={`vs-add ${compact ? "is-compact" : ""}`} onSubmit={(e) => { e.preventDefault(); if (text.trim()) { onAdded(addQuestion(text)); setText(""); } }}>
      <textarea className="vs-add-input" rows={compact ? 1 : 2} placeholder="Type a Question you've been asked, or expect" value={text} onChange={(e) => setText(e.target.value)} onPointerDown={(e) => e.stopPropagation()} />
      <button className="vs-btn" disabled={!text.trim()}>Add Question</button>
    </form>
  );
}

/** "Ask for more Questions" (#9) — disabled once used, or without an Access Token. */
export function AskForMore({ onArrive }: { onArrive: (firstNewIndex: number) => void }) {
  const [waiting, setWaiting] = useState(false);
  if (waiting) return <div className="vs-more is-waiting">Writing 4 more Questions from the Job Spec…</div>;
  if (TOKEN_EXPIRED) return <div className="vs-more is-off">Asking for more Questions needs an Access Token. You can still type your own.</div>;
  if (!canAskForMore()) return <div className="vs-more is-off">You've asked for more once — type your own below, or delete ones you don't need.</div>;
  return <button className="vs-btn is-ghost" onClick={() => { setWaiting(true); askForMore((i) => { setWaiting(false); onArrive(i); }); }}>Ask for 4 more Questions</button>;
}

/** S1: a card after the last Question. */
export function EndCard({ goTo, picks }: SlotProps) {
  const picked = questions.filter((q) => picks[q.id]).length;
  const gaps = questions.filter((q) => !q.unmatched && !q.matches.length).length;
  return (
    <div className="vs-end" onClick={(e) => e.stopPropagation()}>
      <div className="ve-skill">End of the deck</div>
      <div className="vs-end-title">That's all {questions.length} Questions</div>
      <div className="vs-end-sub">{picked} with a story kept{gaps ? ` · ${gaps} ${gaps === 1 ? "Gap" : "Gaps"}` : ""}</div>
      <AskForMore onArrive={goTo} />
      <div className="vs-or">or add your own</div>
      <AddQuestionForm onAdded={goTo} />
    </div>
  );
}

/** S2: the whole deck as a list — jump to any Question, delete, add, ask for more. */
export function QuestionsSheet({ picks, index, goTo, onClose }: Pick<SlotProps, "picks" | "index" | "goTo"> & { onClose: () => void }) {
  return (
    <>
      <div className="vs-scrim" onClick={onClose} />
      <aside className="vs-sheet" aria-label="All Questions">
        <div className="vs-sheet-head"><strong>Questions</strong><span>{questions.length}</span><button className="vs-x" onClick={onClose} aria-label="Close">×</button></div>
        <ol className="vs-list">
          {questions.map((q, i) => {
            const status = q.unmatched ? "new" : !q.matches.length ? "gap" : picks[q.id] ? "kept" : "open";
            return (
              <li key={q.id} className={i === index ? "is-current" : ""}>
                <button className="vs-list-q" onClick={() => { goTo(i); onClose(); }}>
                  <span className={`vs-dot is-${status}`}>{status === "kept" ? "✓" : status === "gap" ? "!" : ""}</span>
                  <span className="vs-list-text"><span>{q.text}</span><span className="vs-list-meta">{q.skill}{status === "new" ? " · Matches not found yet" : status === "gap" ? " · Gap" : ""}</span></span>
                </button>
                <button className="vs-del" onClick={() => { if (confirm(`Delete this Question?\n\n“${q.text}”`)) deleteQuestion(q.id); }} aria-label="Delete Question">🗑</button>
              </li>
            );
          })}
        </ol>
        <div className="vs-sheet-foot">
          <AddQuestionForm compact onAdded={(i) => { goTo(i); onClose(); }} />
          <AskForMore onArrive={(i) => { goTo(i); onClose(); }} />
        </div>
      </aside>
    </>
  );
}

/** A new Interview: Questions are being written from the Job Spec (#9), or can't be without a token. */
export function GeneratingCard() {
  useEffect(() => { if (GENERATING && !TOKEN_EXPIRED) { const t = setTimeout(finishGenerating, 2200); return () => clearTimeout(t); } }, []);
  return (
    <div className="vs-gen">
      {TOKEN_EXPIRED ? (
        <>
          <div className="ve-skill">No Questions yet</div>
          <div className="vs-end-title">Questions can't be written right now</div>
          <p className="vs-end-sub">Writing Questions from the Job Spec uses AI, and your Access Token has expired. You can type your own instead.</p>
          <AddQuestionForm onAdded={() => {}} />
        </>
      ) : (
        <>
          <div className="ve-skill">Senior Product Engineer · Northwind Logistics</div>
          <div className="vs-end-title">Writing your Questions…</div>
          <p className="vs-end-sub">About 8 behavioural Questions from the Job Spec, each tagged with the skill it tests.</p>
          <div className="vs-gen-lines"><span className="vs-shimmer" /><span className="vs-shimmer is-short" /><span className="vs-shimmer" /><span className="vs-shimmer is-short" /></div>
        </>
      )}
    </div>
  );
}

/** S3: a small jump-to menu from the header — just the Questions and their status; tap one to go there. */
export function QuickJump({ picks, index, goTo, onClose }: Pick<SlotProps, "picks" | "index" | "goTo"> & { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <>
      <div className="vs-jump-scrim" onClick={onClose} />
      <nav className="vs-jump" aria-label="Jump to a Question">
        <ol>
          {questions.map((q, i) => {
            const status = q.unmatched ? "new" : !q.matches.length ? "gap" : picks[q.id] ? "kept" : "open";
            return (
              <li key={q.id}>
                <button className={i === index ? "is-current" : ""} onClick={() => { goTo(i); onClose(); }}>
                  <span className="vs-jump-n">{i + 1}</span>
                  <span className={`vs-dot is-${status}`}>{status === "kept" ? "✓" : status === "gap" ? "!" : ""}</span>
                  <span className="vs-jump-q">{q.text}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
