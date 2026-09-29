import { useId, useState, type FormEvent } from "react";
import type { Origin, Scenario } from "./scenarioFormat";

type Name = "title" | "role" | "situation" | "task" | "action" | "result" | "skills" | "measurableResults" | "date" | "company";
type Fields = Record<Name, string>;

const EMPTY: Fields = { title: "", role: "", situation: "", task: "", action: "", result: "", skills: "", measurableResults: "", date: "", company: "" };

/** Each required part, with what to say when it's missing: on the field, and in the "Still missing" summary. */
const REQUIRED: Partial<Record<Name, { onField: string; inSummary: string }>> = {
  title: { onField: "Give it a title", inSummary: "a title" },
  role: { onField: "Add your role", inSummary: "your role" },
  situation: { onField: "Add the Situation", inSummary: "the Situation" },
  task: { onField: "Add the Task", inSummary: "the Task" },
  action: { onField: "Add the Action", inSummary: "the Action" },
  result: { onField: "Add the Result", inSummary: "the Result" },
  skills: { onField: "Add at least one skill", inSummary: "at least one skill" },
};

const PLACEHOLDER: Partial<Record<Name, string>> = {
  title: 'A short name you\'ll recognise, e.g. "Rescued the failing checkout migration"',
  role: "Your role at the time",
  situation: "What was going on? Keep it to the context that matters.",
  task: "What were you responsible for?",
  action: 'What did you do? Say "I", not "we".',
  result: "What changed because of what you did?",
  skills: "Skills this Scenario shows, separated by commas",
  date: "Optional, e.g. 2023",
  company: "Optional — leave it out if it's sensitive",
};

const HINT: Partial<Record<Name, string>> = {
  measurableResults: 'Optional. If you can, add a number or what changed, e.g. "errors down 40%". One per line.',
};

/** Creating or editing a Scenario by hand (spec #1, stories 28–31). It says which required parts are missing
 * rather than saving an incomplete Scenario. */
export function ScenarioForm({ initial, onSave, onCancel }: { initial?: Scenario; onSave: (scenario: Scenario) => Promise<void>; onCancel: () => void }) {
  const [fields, setFields] = useState<Fields>(() => (initial ? toFields(initial) : EMPTY));
  const origin: Origin = initial?.origin ?? "hand-written"; // editing never changes where a Scenario came from
  const [tried, setTried] = useState(false);
  const id = useId();
  const missing = (Object.keys(REQUIRED) as Name[]).filter((name) => (name === "skills" ? splitSkills(fields.skills).length === 0 : !fields[name].trim()));

  function submit(event: FormEvent) {
    event.preventDefault();
    setTried(true);
    if (missing.length === 0) void onSave(toScenario(fields, origin));
  }

  const field = (name: Name, label: string, multiline = false) => {
    const Field = multiline ? "textarea" : "input";
    const isMissing = tried && missing.includes(name);
    const note = isMissing ? REQUIRED[name]!.onField : HINT[name];
    return (
      <div className="form-field">
        <label htmlFor={`${id}-${name}-field`} className="form-label">
          {label}
          {REQUIRED[name] && <span className="form-required"> *</span>}
        </label>
        <Field
          id={`${id}-${name}-field`}
          className="field"
          rows={multiline ? 3 : undefined}
          placeholder={PLACEHOLDER[name]}
          aria-invalid={isMissing}
          aria-describedby={note ? `${id}-${name}` : undefined}
          value={fields[name]}
          onChange={(e) => setFields((f) => ({ ...f, [name]: e.target.value }))}
        />
        {note && (
          <span id={`${id}-${name}`} className={isMissing ? "error" : "form-hint"}>
            {note}
          </span>
        )}
      </div>
    );
  };

  return (
    <form className="form" onSubmit={submit} noValidate>
      {field("title", "Title")}
      {field("role", "Your role")}
      {field("situation", "Situation", true)}
      {field("task", "Task", true)}
      {field("action", "Action", true)}
      {field("result", "Result", true)}
      {field("skills", "Skills")}
      {field("measurableResults", "Measurable results", true)}
      <div className="form-row">
        {field("date", "Date")}
        {field("company", "Company")}
      </div>
      {tried && missing.length > 0 && (
        <p role="alert" className="error">
          Still missing: {missing.map((name) => REQUIRED[name]!.inSummary).join(", ")}.
        </p>
      )}
      <div className="actions">
        <button type="submit" className="button-primary">
          Save Scenario
        </button>
        <button type="button" className="button-link" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

const splitSkills = (text: string) => text.split(",").map((s) => s.trim()).filter(Boolean);
const splitLines = (text: string) => text.split("\n").map((s) => s.trim()).filter(Boolean);

function toFields(s: Scenario): Fields {
  return { ...s, skills: s.skills.join(", "), measurableResults: s.measurableResults.join("\n"), date: s.date ?? "", company: s.company ?? "" };
}

function toScenario(f: Fields, origin: Origin): Scenario {
  return {
    title: f.title.trim(),
    role: f.role.trim(),
    situation: f.situation.trim(),
    task: f.task.trim(),
    action: f.action.trim(),
    result: f.result.trim(),
    skills: splitSkills(f.skills),
    measurableResults: splitLines(f.measurableResults),
    date: f.date.trim() || undefined,
    company: f.company.trim() || undefined,
    origin,
  };
}
