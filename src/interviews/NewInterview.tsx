import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import type { Interview } from "./interview";
import { SAMPLE_JOB_SPEC } from "./sampleJobSpec";

type Name = "role" | "company" | "jobSpec";

const REQUIRED: Partial<Record<Name, { onField: string; inSummary: string }>> = {
  role: { onField: "Add the role you're applying for", inSummary: "the role" },
  jobSpec: { onField: "Paste the Job Spec", inSummary: "the Job Spec" },
};

/** D2's New Interview drawer: the role, the company and the pasted Job Spec. #9 adds generating Questions, and
 * fills in the role and company from the Job Spec when it can. */
export function NewInterview({ onCreate, onCancel }: { onCreate: (interview: Interview) => Promise<void>; onCancel: () => void }) {
  const id = useId();
  const [fields, setFields] = useState<Record<Name, string>>({ role: "", company: "", jobSpec: "" });
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const missing = (Object.keys(REQUIRED) as Name[]).filter((name) => !fields[name].trim());
  const dialog = useRef<HTMLDivElement>(null);

  // A modal drawer: focus starts on the first field and stays inside until it closes.
  useEffect(() => {
    dialog.current?.querySelector<HTMLElement>("input")?.focus();
  }, []);

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") return onCancel();
    if (e.key !== "Tab") return;
    const focusable = [...(dialog.current?.querySelectorAll<HTMLElement>("input, textarea, button") ?? [])].filter((el) => !el.hasAttribute("disabled"));
    const [first, last] = [focusable[0], focusable[focusable.length - 1]];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setTried(true);
    if (missing.length > 0 || saving) return;
    setSaving(true); // a second click mustn't create a second Interview
    setFailed(false);
    try {
      await onCreate({ role: fields.role.trim(), company: fields.company.trim() || undefined, jobSpec: fields.jobSpec.trim(), questions: [] });
    } catch {
      setFailed(true);
      setSaving(false);
    }
  }

  const field = (name: Name, label: string, multiline = false, placeholder?: string) => {
    const Field = multiline ? "textarea" : "input";
    const isMissing = tried && missing.includes(name);
    return (
      <div className="form-field">
        <label htmlFor={`${id}-${name}`} className="form-label">
          {label}
          {REQUIRED[name] && <span className="form-required"> *</span>}
        </label>
        <Field
          id={`${id}-${name}`}
          className="field"
          rows={multiline ? 8 : undefined}
          placeholder={placeholder}
          aria-invalid={isMissing}
          aria-describedby={isMissing ? `${id}-${name}-missing` : undefined}
          value={fields[name]}
          onChange={(e) => setFields((f) => ({ ...f, [name]: e.target.value }))}
        />
        {isMissing && (
          <span id={`${id}-${name}-missing`} className="error">
            {REQUIRED[name]!.onField}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="drawer-backdrop">
      <div className="drawer" role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} ref={dialog} onKeyDown={onKeyDown}>
        <form className="form" onSubmit={(e) => void submit(e)} noValidate>
          <h2 id={`${id}-title`} className="pane-title">
            New Interview
          </h2>
          {field("role", "Role", false, "e.g. Senior Product Engineer")}
          {field("company", "Company", false, "Optional")}
          {field("jobSpec", "Job Spec", true, "Paste the Job Spec here — all of it is fine.")}
          <button type="button" className="button-link" onClick={() => setFields((f) => ({ ...f, jobSpec: SAMPLE_JOB_SPEC }))}>
            Use a sample Job Spec
          </button>
          {tried && missing.length > 0 && (
            <p role="alert" className="error">
              Still missing: {missing.map((name) => REQUIRED[name]!.inSummary).join(", ")}.
            </p>
          )}
          {failed && (
            <p role="alert" className="error">
              Couldn't create the Interview. Try again; if it keeps failing, this browser may be out of storage space.
            </p>
          )}
          <div className="actions">
            <button type="submit" className="button-primary" disabled={saving}>
              Create Interview
            </button>
            <button type="button" className="button-link" onClick={onCancel}>
              Cancel
            </button>
          </div>
          <p className="form-hint">Instructions hidden in a Job Spec are treated as plain text.</p>
        </form>
      </div>
    </div>
  );
}
