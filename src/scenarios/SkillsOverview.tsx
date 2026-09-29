import type { SavedScenario } from "./scenarioBank";
import { skillCounts } from "./skills";

const SHOWN = 4;

type Props = {
  scenarios: SavedScenario[];
  /** The skillKey the list is filtered by. */
  filter: string | null;
  onFilter: (key: string | null) => void;
};

/** C4's compact skills overview: the top skills the Candidate's Scenarios cover, each one a filter for the list.
 * Search finds the rest. "Not covered yet" joins it when Gaps exist (#10). */
export function SkillsOverview({ scenarios, filter, onFilter }: Props) {
  const counts = skillCounts(scenarios);
  const most = Math.max(1, ...counts.map((c) => c.count));

  return (
    <section className="skills-panel" aria-labelledby="skills-covered">
      <p id="skills-covered" className="label-caps skills-panel-title">
        Skills your Scenarios cover
      </p>
      {counts.length === 0 && <p className="skills-empty">No Scenarios yet.</p>}
      <ul className="skills-list">
        {counts.slice(0, SHOWN).map(({ key, skill, count }) => (
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
    </section>
  );
}
