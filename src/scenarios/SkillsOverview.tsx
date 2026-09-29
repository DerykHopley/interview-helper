import type { SavedScenario } from "./scenarioBank";
import { skillCounts, skillKey } from "./skills";

const SHOWN = 4;

type Props = {
  scenarios: SavedScenario[];
  /** Skills the Interviews' Gaps asked for; those no Scenario covers show as "Not covered yet". */
  gapSkills: string[];
  /** The skillKey the list is filtered by. */
  filter: string | null;
  onFilter: (key: string | null) => void;
  /** Starts a new Scenario tagged with this skill. #13 makes it co-writing. */
  onWrite: (skill: string) => void;
};

/** C4's compact skills overview: the top skills the Candidate's Scenarios cover, each one a filter for the list
 * (search finds the rest), and the skills their Interviews' Gaps asked for that no Scenario covers yet. */
export function SkillsOverview({ scenarios, gapSkills, filter, onFilter, onWrite }: Props) {
  const counts = skillCounts(scenarios);
  const most = Math.max(1, ...counts.map((c) => c.count));
  const covered = new Set(counts.map((c) => c.key));
  const uncovered = gapSkills.filter((skill) => !covered.has(skillKey(skill)));

  return (
    <div className="skills-overview">
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
      {uncovered.length > 0 && (
        <section className="skills-panel uncovered-panel" aria-labelledby="skills-uncovered">
          <p id="skills-uncovered" className="label-caps skills-panel-title uncovered-title">
            Not covered yet
          </p>
          <ul className="gap-chips">
            {uncovered.map((skill) => (
              <li key={skill}>
                <button type="button" className="gap-chip is-button" aria-label={`Write a Scenario for ${skill}`} onClick={() => onWrite(skill)}>
                  {skill} <span aria-hidden="true">+</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
