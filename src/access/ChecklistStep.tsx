import type { ReactNode } from "react";

type Props = {
  n: number;
  title: string;
  /** The one-line reason for this step. */
  why: string;
  /** "danger" is the current step turned red, for Start over. */
  state: "done" | "current" | "upcoming" | "danger";
  /** Shown after the title once the step is done. */
  summary?: string;
  children?: ReactNode;
};

/** One numbered step of the A2 checklist (docs/prototypes/access/README.md). Only the current step is open; a
 * finished one folds into ✓ and its summary. */
export function ChecklistStep({ n, title, why, state, summary, children }: Props) {
  return (
    <li className={`step is-${state}`}>
      <span className="step-number" aria-hidden="true">
        {state === "done" ? "✓" : n}
      </span>
      <div className="step-body">
        <h3 className="step-title">
          {state === "done" && <span className="visually-hidden">Done: </span>}
          {title}
          {state === "done" && summary && <span className="step-summary"> · {summary}</span>}
        </h3>
        <p className="step-why">{why}</p>
        {(state === "current" || state === "danger") && <div className="step-open">{children}</div>}
      </div>
    </li>
  );
}
