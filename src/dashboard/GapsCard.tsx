import { useState } from "react";
import { useCancellableEffect } from "../hooks";
import { gapsBySkill } from "../interviews/gaps";
import type { InterviewStore } from "../interviews/interviewStore";
import { countOf } from "../text";

/** D2's side-column "Gaps by skill" card: the skills the Candidate's Interviews found no Scenario for. Hidden when
 * there are none. */
export function GapsCard({ store }: { store: InterviewStore }) {
  const [gaps, setGaps] = useState<{ skill: string; count: number }[]>([]);

  useCancellableEffect(
    (isCurrent) => {
      store.list().then(
        ({ interviews }) => isCurrent() && setGaps(gapsBySkill(interviews)),
        () => {},
      );
    },
    [store],
  );

  const total = gaps.reduce((sum, g) => sum + g.count, 0);
  if (total === 0) return null;
  return (
    <section className="side-card" aria-labelledby="side-gaps">
      <h3 id="side-gaps" className="label-caps side-card-title">
        Gaps
      </h3>
      <p className="side-card-text">
        {countOf(total, "Question")} {total === 1 ? "has" : "have"} no good Scenario yet.
      </p>
      <ul className="gap-chips">
        {gaps.map(({ skill, count }) => (
          <li key={skill} className="gap-chip">
            {skill}
            {count > 1 && <span className="gap-chip-count"> ×{count}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
