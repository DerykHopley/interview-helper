import { useEffect, useId, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from "react";
import { useLatest } from "../hooks";
import { useModelGateway } from "../model-gateway/context";
import type { Interview } from "./interview";
import { callProblemOf } from "../model-gateway/callProblems";
import { detectRoleAndCompany, FIRST_BATCH } from "./questionGenerator";
import { SAMPLE_JOB_SPEC } from "./sampleJobSpec";

type Name = "role" | "company" | "jobSpec";

const REQUIRED: Partial<Record<Name, { onField: string; inSummary: string }>> = {
  role: { onField: "Add the role you're applying for", inSummary: "the role" },
  jobSpec: { onField: "Paste the Job Spec", inSummary: "the Job Spec" },
};

type Props = {
  /** Whether an Access Token is active, so Questions can be written and the role and company found. */
  accessActive: boolean;
  /** A model call found the Access Token expired. */
  onTokenExpired: () => void;
  /** Creates the Interview; `generate` asks for its first Questions to be written. */
  onCreate: (interview: Interview, generate: boolean) => Promise<void>;
  onCancel: () => void;
};

/** D2's New Interview drawer: the pasted Job Spec, then the role and company, which a quick model call fills in from
 * the Job Spec when they're empty (#9). With an Access Token, creating also writes the first Questions. */
/** Finding the role and company: under way, or why it came back empty. */
type Lookup = "finding" | "not-found" | "expired" | "failed";
const LOOKUP_TEXT: Record<Lookup, string> = {
  finding: "Finding the role and company…",
  "not-found": "The Job Spec doesn't seem to name the role or company. Type them in.",
  expired: "Your Access Token has expired, so the role and company can't be found. Type them in.",
  failed: "Couldn't find the role and company this time. Type them in.",
};

export function NewInterview({ accessActive, onTokenExpired, onCreate, onCancel }: Props) {
  const id = useId();
  const gateway = useModelGateway();
  const [fields, setFields] = useState<Record<Name, string>>({ role: "", company: "", jobSpec: "" });
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const missing = (Object.keys(REQUIRED) as Name[]).filter((name) => !fields[name].trim());
  const dialog = useRef<HTMLDivElement>(null);
  const lastDetected = useRef("");
  const latestFields = useLatest(fields);

  // A modal drawer: focus starts on the first field and stays inside until it closes.
  useEffect(() => {
    dialog.current?.querySelector<HTMLElement>("input, textarea")?.focus();
  }, []);

  /** Fills in the role and company from this Job Spec, if either is still empty; never over what's been typed, even
   * while the reply is on its way. Once per Job Spec text. */
  async function detect(jobSpec: string) {
    const spec = jobSpec.trim();
    const { role, company } = latestFields.current;
    if (!accessActive || !spec || spec === lastDetected.current || (role.trim() && company.trim())) return;
    lastDetected.current = spec;
    setLookup("finding");
    try {
      const found = await detectRoleAndCompany(gateway, spec);
      setFields((f) => ({ ...f, role: f.role.trim() ? f.role : (found.role ?? f.role), company: f.company.trim() ? f.company : (found.company ?? f.company) }));
      setLookup(found.role || found.company ? null : "not-found");
    } catch (e) {
      const expired = callProblemOf(e) === "expired-token";
      if (expired) onTokenExpired();
      setLookup(expired ? "expired" : "failed");
    }
  }

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
      await onCreate({ role: fields.role.trim(), company: fields.company.trim() || undefined, jobSpec: fields.jobSpec.trim(), questions: [] }, accessActive);
    } catch {
      setFailed(true);
      setSaving(false);
    }
  }

  const field = (name: Name, label: string, multiline = false, placeholder?: string) => {
    const Field = multiline ? "textarea" : "input";
    // The Job Spec box looks for the role and company once the Candidate has pasted, or moves on. (Defined here, not
    // passed in: the React Compiler's lint won't let a callback that reads refs be handed to a render-time helper.)
    const events =
      name === "jobSpec"
        ? {
            onPaste: (e: ClipboardEvent<HTMLElement>) => {
              const box = e.currentTarget as HTMLTextAreaElement;
              setTimeout(() => void detect(box.value)); // once the pasted text is in
            },
            onBlur: () => void detect(fields.jobSpec),
          }
        : {};
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
          {...events}
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
          {field("jobSpec", "Job Spec", true, "Paste the Job Spec here — all of it is fine.")}
          <button
            type="button"
            className="button-link"
            onClick={() => {
              setFields((f) => ({ ...f, jobSpec: SAMPLE_JOB_SPEC }));
              void detect(SAMPLE_JOB_SPEC);
            }}
          >
            Use a sample Job Spec
          </button>
          {lookup && (
            <p role="status" className="form-hint">
              {LOOKUP_TEXT[lookup]}
            </p>
          )}
          {field("role", "Role", false, "e.g. Senior Product Engineer")}
          {field("company", "Company", false, "Optional")}
          {!accessActive && (
            <p className="notice-warn">
              Questions can't be written without an active Access Token. You can still create the Interview and type your own Questions.
            </p>
          )}
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
              {accessActive ? `Create and generate ~${FIRST_BATCH.ask} Questions` : "Create without Questions"}
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
