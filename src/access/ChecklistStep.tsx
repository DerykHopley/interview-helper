import type { ReactNode } from "react";

type Props = {
  n: number;
  title: string;
  /** The one-line reason for this step. */
  why: string;
  state: "done" | "current" | "upcoming";
  /** Shown after the title once the step is done. */
  summary?: string;
  children?: ReactNode;
};

/** One numbered step of the A2 checklist (docs/prototypes/access/README.md). Only the current step is open; a
 * finished one folds into ✓ and its summary. */
export function ChecklistStep({ n, title, why, state, summary, children }: Props) {
  return (
    <li>
      <h3>
        {state === "done" ? "✓" : n} {title}
        {state === "done" && summary && <span> · {summary}</span>}
      </h3>
      <p>{why}</p>
      {state === "current" && children}
    </li>
  );
}
