import type { ReactNode } from "react";
import { SECTIONS, type Origin } from "./scenarioFormat";
import type { SavedScenario } from "./scenarioBank";

const ORIGIN_LABEL: Record<Origin, string> = { "hand-written": "Written by hand", "co-written": "Co-written with AI", demo: "Demo" };

/** Where a Scenario came from (spec #1, story 32). */
export function OriginBadge({ origin }: { origin: Origin }) {
  return <span className={`origin is-${origin}`}>{ORIGIN_LABEL[origin]}</span>;
}

/** A Scenario's skill tags, as small chips. */
export function SkillTags({ skills }: { skills: string[] }) {
  return (
    <span className="skill-tags">
      {skills.map((skill) => (
        <span key={skill} className="skill-tag">
          {skill}
        </span>
      ))}
    </span>
  );
}

/** A Scenario in full, in its fixed shape, for reading before practising (spec #1, story 27). */
export function ScenarioReader({ scenario, actions }: { scenario: SavedScenario; actions: ReactNode }) {
  const roleAndContext = [scenario.role, scenario.company, scenario.date].filter(Boolean).join(" · ");
  return (
    <article className="reader" aria-labelledby="reader-title">
      <div className="pane-head">
        <h3 id="reader-title" className="pane-title">
          {scenario.title}
        </h3>
        {actions}
      </div>
      <div className="card reader-card">
        <p className="reader-meta">
          <OriginBadge origin={scenario.origin} /> {roleAndContext}
        </p>
        {SECTIONS.map(([field, heading]) => (
          <section key={field}>
            <h4 className="label-caps reader-heading">{heading}</h4>
            <p className="reader-text">{scenario[field]}</p>
          </section>
        ))}
        {scenario.measurableResults.length > 0 && (
          <section>
            <h4 className="label-caps reader-heading">Measurable results</h4>
            <ul className="reader-results">
              {scenario.measurableResults.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </section>
        )}
        <SkillTags skills={scenario.skills} />
      </div>
    </article>
  );
}
