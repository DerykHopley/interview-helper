// PROTOTYPE — pieces every Scenario Bank variant uses, so the form and wording stay constant and only layout differs.
import { useState } from "react";
import { FIELD_HINT, MISSING_TEXT, ORIGIN_LABEL, missingFields, type Origin, type Scenario } from "./data";

export function OriginBadge({ origin }: { origin: Origin }) {
  return <span className={`sb-origin is-${origin}`}>{origin === "demo" ? "demo" : ORIGIN_LABEL[origin]}</span>;
}

export function Tags({ tags }: { tags: string[] }) {
  return <span className="sb-tags">{tags.map((t) => <span key={t}>{t}</span>)}</span>;
}

/** The full Scenario in the fixed STAR format, for reading before practising (story 27). */
export function ScenarioReader({ s }: { s: Scenario }) {
  return (
    <div className="sb-reader">
      <div className="sb-reader-meta">
        <OriginBadge origin={s.origin} />
        <span>{s.role}{s.company ? ` · ${s.company}` : ""}{s.date ? ` · ${s.date}` : ""}</span>
      </div>
      {([["Situation", s.situation], ["Task", s.task], ["Action", s.action], ["Result", s.result]] as const).map(([k, v]) => (
        <section key={k} className="sb-star">
          <h4>{k}</h4>
          <p>{v}</p>
        </section>
      ))}
      <section className="sb-star sb-metrics"><h4>Measurable results</h4><p>{s.metrics}</p></section>
      <div className="sb-reader-foot">
        <Tags tags={s.tags} />
        <span className="sb-used">{s.usedIn.length ? `Picked in: ${s.usedIn.join("; ")}` : "Not picked in any Interview yet"}</span>
      </div>
    </div>
  );
}

/** Create or edit by hand (stories 28–31): tells you which required parts are missing instead of saving. */
export function ScenarioForm({ initial, onSave, onCancel }: { initial: Scenario; onSave: (s: Scenario) => void; onCancel: () => void }) {
  const [s, setS] = useState(initial);
  const [tried, setTried] = useState(false);
  const [tagText, setTagText] = useState(initial.tags.join(", "));
  const missing = missingFields(s);
  const set = (k: keyof Scenario, v: string) => setS((x) => ({ ...x, [k]: v }));
  const field = (k: keyof Scenario, label: string, multiline = false) => {
    const bad = tried && missing.includes(k);
    const Tag = multiline ? "textarea" : "input";
    return (
      <label className={`sb-field ${bad ? "is-missing" : ""}`}>
        <span className="sb-field-label">{label}{!["date", "company", "tags"].includes(k) && <span className="sb-req"> *</span>}</span>
        <Tag className="sb-input" rows={multiline ? 3 : undefined} value={String(s[k] ?? "")} placeholder={FIELD_HINT[k]} onChange={(e) => set(k, e.target.value)} />
        {bad && <span className="sb-missing">{MISSING_TEXT[k]}</span>}
      </label>
    );
  };

  return (
    <form
      className="sb-form"
      onSubmit={(e) => {
        e.preventDefault();
        setTried(true);
        if (!missing.length) onSave({ ...s, tags: tagText.split(",").map((t) => t.trim()).filter(Boolean) });
      }}
    >
      {field("title", "Title")}
      {field("role", "Your role")}
      {field("situation", "Situation", true)}
      {field("task", "Task", true)}
      {field("action", "Action", true)}
      {field("result", "Result", true)}
      {field("metrics", "Measurable results")}
      <label className="sb-field">
        <span className="sb-field-label">Skills</span>
        <input className="sb-input" value={tagText} placeholder={FIELD_HINT.tags} onChange={(e) => setTagText(e.target.value)} />
      </label>
      <div className="sb-field-row">
        {field("date", "Date")}
        {field("company", "Company")}
      </div>
      {tried && missing.length > 0 && <div className="sb-form-error">Still missing: {missing.map((k) => MISSING_TEXT[k]?.replace(/^Add (the |a )?|^Give it a /, "")).join(", ")}.</div>}
      <div className="sb-form-actions">
        <button className="sb-primary">Save story</button>
        <button type="button" className="sb-link" onClick={onCancel}>Cancel</button>
        <span className="sb-origin-note">Origin: {ORIGIN_LABEL[s.origin]}</span>
      </div>
    </form>
  );
}

/** How a new Scenario starts: by hand now, or co-written (co-writing is its own prototype, #12). */
export function NewStoryChoice({ onHand, onCancel }: { onHand: () => void; onCancel?: () => void }) {
  const [cowrite, setCowrite] = useState(false);
  return (
    <div className="sb-choice">
      <button className="sb-choice-btn" onClick={onHand}>
        <strong>Write it myself</strong>
        <span>Fill in the Situation, Task, Action and Result. No AI, no budget.</span>
      </button>
      <button className="sb-choice-btn" onClick={() => setCowrite(true)}>
        <strong>Co-write with AI</strong>
        <span>Answer a few questions; the AI arranges your own facts and never adds any.</span>
      </button>
      {cowrite && <div className="sb-note">Co-writing opens a chat — that screen is prototyped separately (#12).</div>}
      {onCancel && <button className="sb-link" onClick={onCancel}>Cancel</button>}
    </div>
  );
}

export function confirmDelete(s: Scenario) {
  const note = s.usedIn.length ? `\n\nIt's the picked story in ${s.usedIn.length} Interview${s.usedIn.length > 1 ? "s" : ""}; those Questions will need a new pick.` : "";
  return confirm(`Delete "${s.title}"?${note}`);
}
