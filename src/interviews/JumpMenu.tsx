import { useRef, useState } from "react";
import { useDismiss } from "../hooks";
import type { Question } from "./interview";

/** S3's ☰ Questions menu in the header: every Question by number, the current one marked; choosing one jumps to it.
 * Escape or a click outside closes it. Status dots (✓ kept, ! Gap) join with #10 and #11. */
export function JumpMenu({ questions, current, onJump }: { questions: Question[]; current: number; onJump: (index: number) => void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useDismiss(open, root, () => setOpen(false));

  if (questions.length === 0) return null;
  return (
    <div className="jump" ref={root}>
      <button type="button" className="button-lock" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        ☰ Questions
      </button>
      {open && (
        <ol className="jump-menu" role="menu" aria-label="Questions">
          {questions.map((question, i) => (
            <li key={question.id} role="none">
              <button
                type="button"
                role="menuitem"
                className="jump-item"
                aria-current={i === current ? "true" : undefined}
                onClick={() => {
                  onJump(i);
                  setOpen(false);
                }}
              >
                <span className="jump-number">{i + 1}</span> {question.text}
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
