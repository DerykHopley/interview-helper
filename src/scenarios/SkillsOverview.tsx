import { useState } from "react";
import type { SavedScenario } from "./scenarioBank";

const COMPACT = 4;

/** How many Scenarios cover each skill, most first. Skills are grouped ignoring capitals and shown as first written. */
export function skillCounts(scenarios: SavedScenario[]) {
  const counts = new Map<string, { skill: string; count: number }>();
  for (const scenario of scenarios) {
    for (const skill of new Set(scenario.skills.map((s) => s.toLowerCase()))) {
      const entry = counts.get(skill) ?? { skill: scenario.skills.find((s) => s.toLowerCase() === skill)!, count: 0 };
      counts.set(skill, { ...entry, count: entry.count + 1 });
    }
  }
  return [...counts.entries()].map(([key, v]) => ({ key, ...v })).sort((a, b) => b.count - a.count || a.skill.localeCompare(b.skill));
}

type Props = {
  scenarios: SavedScenario[];
  /** The skill the list is filtered by, lower case. */
  filter: string | null;
  onFilter: (skill: string | null) => void;
};

/** C4's compact skills overview: the skills the Candidate's Scenarios cover, each one a filter for the list. "Not
 * covered yet" joins it when Gaps exist (#10). */
export function SkillsOverview({ scenarios, filter, onFilter }: Props) {
  const [all, setAll] = useState(false);
  const counts = skillCounts(scenarios);
  const most = Math.max(1, ...counts.map((c) => c.count));
  const shown = all ? counts : counts.slice(0, COMPACT);

  return (
    <section className="skills-panel" aria-labelledby="skills-covered">
      <h3 id="skills-covered" className="skills-panel-title">
        Skills your Scenarios cover
      </h3>
      {counts.length === 0 && <p className="skills-empty">No Scenarios yet.</p>}
      <ul className="skills-list">
        {shown.map(({ key, skill, count }) => (
          <li key={key}>
            <button type="button" className="skill-row" aria-pressed={filter === key} onClick={() => onFilter(filter === key ? null : key)}>
              <span className="skill-name">{skill}</span>
              <span className="skill-bar" aria-hidden="true">
                <span style={{ width: `${(count / most) * 100}%` }} />
              </span>
              <span className="skill-count">{count}</span>
            </button>
          </li>
        ))}
      </ul>
      {counts.length > COMPACT && (
        <button type="button" className="button-link" onClick={() => setAll((v) => !v)}>
          {all ? "Show fewer" : `Show all ${counts.length} skills`}
        </button>
      )}
    </section>
  );
}
