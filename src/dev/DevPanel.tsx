import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { REASONING_EFFORTS, type ModelJob, type ReasoningEffort } from "../../shared/workerProtocol";
import { useCancellableEffect } from "../hooks";
import { MATCHING_CONFIG, measuredSetups } from "../matching/matchingConfig";
import { PROMPT_VARIANTS } from "../matching/promptVariants";
import { useModelGateway } from "../model-gateway/context";
import type { AllowedModel, ModelCall, ModelsResponse } from "../model-gateway/ModelGateway";
import { countOf } from "../text";
import { devSettings, jobName, overrideCount, PANEL_JOBS, pruneSettings, useDevSettings, type Dropped, type JobOverride, type PanelJob } from "./devSettings";

/** The most calls the log keeps, newest last. */
const MAX_CALLS = 200;

/** The Setups the Matcher Report measured (they don't change while the app runs), and the shipped one among them. */
const MEASURED = measuredSetups();
const SHIPPED_SETUP = MEASURED.find(
  ({ setup }) => setup.promptVariant === MATCHING_CONFIG.promptVariant && setup.model === MATCHING_CONFIG.model && setup.reasoningEffort === MATCHING_CONFIG.reasoningEffort,
);

const isToggle = (e: KeyboardEvent) => e.ctrlKey && e.shiftKey && !e.altKey && !e.metaKey && e.key.toLowerCase() === "d";

/** A call log entry, numbered so the log keeps its keys as old entries drop off. */
type LoggedCall = ModelCall & { n: number };

/** The Developer panel (#17): the owner's model settings for each job, and a log of this session's calls with their
 * tokens and billed cost. Hidden until developer mode is turned on (Ctrl+Shift+D, or ?dev=1 in the address), which
 * this browser remembers. It never sees prompt or reply text. */
export function DevMode({ accessActive }: { accessActive: boolean }) {
  const { enabled } = useDevSettings();
  const gateway = useModelGateway();
  const [calls, setCalls] = useState<LoggedCall[]>([]);

  // ?dev=1 turns it on; Ctrl+Shift+D turns it on or off.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("dev") === "1") devSettings.set((s) => ({ ...s, enabled: true }));
    const onKey = (e: KeyboardEvent) => {
      if (!isToggle(e)) return;
      e.preventDefault();
      devSettings.set((s) => ({ ...s, enabled: !s.enabled }));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // The log runs while developer mode is on, whether or not the drawer is open.
  useEffect(() => {
    if (!enabled) return;
    let n = 0;
    return gateway.onCall((call) => setCalls((all) => [...all, { ...call, n: n++ }].slice(-MAX_CALLS)));
  }, [gateway, enabled]);

  return enabled ? <DevDrawer calls={calls} accessActive={accessActive} /> : null;
}

const TABS = [
  ["settings", "Settings"],
  ["calls", "Calls"],
] as const;
type Tab = (typeof TABS)[number][0];

function DevDrawer({ calls, accessActive }: { calls: LoggedCall[]; accessActive: boolean }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("settings");
  const opener = useRef<HTMLButtonElement>(null);
  const closer = useRef<HTMLButtonElement>(null);
  const tabButtons = useRef(new Map<Tab, HTMLButtonElement>());
  const total = calls.reduce((sum, c) => sum + (c.cost ?? 0), 0);
  const ids = useId();

  // Opening moves focus into the drawer; closing returns it to the DEV tab.
  useEffect(() => {
    if (open) closer.current?.focus();
  }, [open]);
  const close = () => {
    setOpen(false);
    opener.current?.focus();
  };

  /** ← and → (and Home, End) move between the tabs, as a tab list does. */
  function onTabKey(e: ReactKeyboardEvent) {
    const at = TABS.findIndex(([key]) => key === tab);
    const to = { ArrowRight: at + 1, ArrowLeft: at - 1, Home: 0, End: TABS.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    const [next] = TABS[(to + TABS.length) % TABS.length];
    setTab(next);
    tabButtons.current.get(next)?.focus();
  }

  return (
    <>
      <button ref={opener} type="button" className="dev-tab" aria-label="Developer panel" aria-expanded={open} onClick={() => (open ? close() : setOpen(true))}>
        DEV
      </button>
      {open && (
        <aside className="dev-panel" aria-label="Developer" onKeyDown={(e) => e.key === "Escape" && close()}>
          <div className="dev-head">
            <h2 className="dev-title">Developer</h2>
            <span className="dev-session">{money(total)} this session</span>
            <button ref={closer} type="button" className="dev-close" aria-label="Close the Developer panel" onClick={close}>
              ×
            </button>
          </div>
          <div className="dev-tabs" role="tablist" aria-label="Developer panel" onKeyDown={onTabKey}>
            {TABS.map(([key, label]) => (
              <button
                key={key}
                ref={(el) => void (el ? tabButtons.current.set(key, el) : tabButtons.current.delete(key))}
                type="button"
                role="tab"
                id={`${ids}-${key}`}
                aria-selected={tab === key}
                aria-controls={`${ids}-${key}-panel`}
                tabIndex={tab === key ? 0 : -1}
                onClick={() => setTab(key)}
              >
                {label}
                {key === "calls" && (
                  <>
                    {" "}
                    <span className="dev-count">{calls.length}</span>
                  </>
                )}
              </button>
            ))}
          </div>
          <div role="tabpanel" id={`${ids}-settings-panel`} aria-labelledby={`${ids}-settings`} hidden={tab !== "settings"}>
            <SettingsTab accessActive={accessActive} />
          </div>
          <div role="tabpanel" id={`${ids}-calls-panel`} aria-labelledby={`${ids}-calls`} hidden={tab !== "calls"}>
            <CallsTab calls={calls} total={total} />
          </div>
          <button type="button" className="dev-link dev-off" onClick={() => devSettings.set((s) => ({ ...s, enabled: false }))}>
            Turn off developer mode
          </button>
        </aside>
      )}
    </>
  );
}

/** "$0.00123", or "cost unknown". */
const money = (cost: number | null) => (cost === null ? "cost unknown" : `$${cost.toFixed(5)}`);
/** "$0.25 / $2 per million", or "price unknown". */
const priceOf = (model: AllowedModel) => (model.price ? `$${model.price.inputPerMillion} / $${model.price.outputPerMillion} per million` : "price unknown");
const time = (at: Date) => at.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
/** Why a billed call failed, as the log says it. */
const FAILED_TEXT: Partial<Record<string, string>> = { reply_cut_off: "cut off", invalid_model_reply: "reply unreadable", model_unavailable: "model error" };

function CallsTab({ calls, total }: { calls: LoggedCall[]; total: number }) {
  if (calls.length === 0) return <p className="dev-note">No calls yet this session.</p>;
  return (
    <>
      <ul className="dev-calls">
        {calls.map((c) => (
          <li key={c.n} className={c.failed ? "is-failed" : undefined}>
            <span className="dev-call-what">
              {jobName(c.job)} · {c.model}
            </span>
            <span className="dev-call-cost">{money(c.cost)}</span>
            <span className="dev-call-detail">
              {c.tokens ? `${c.tokens.input.toLocaleString("en-GB")} → ${c.tokens.output.toLocaleString("en-GB")} tokens` : "tokens unknown"} · {(c.durationMs / 1000).toFixed(1)} s · {time(c.at)}
              {c.failed && ` · failed: ${FAILED_TEXT[c.failed] ?? c.failed}`}
            </span>
          </li>
        ))}
      </ul>
      <p className="dev-total">
        <span>{countOf(calls.length, "call")} this session</span>
        <span className="dev-total-cost">{money(total)}</span>
      </p>
      <p className="dev-note">Costs are what OpenRouter billed, including calls that failed after it answered. Tokens and cost only: no prompt or reply text is kept.</p>
    </>
  );
}

type Loaded = { status: "loading" } | { status: "failed" } | { status: "ready"; allowed: ModelsResponse };

function SettingsTab({ accessActive }: { accessActive: boolean }) {
  const gateway = useModelGateway();
  const settings = useDevSettings();
  const [job, setJob] = useState<PanelJob>("question-generation");
  const [loaded, setLoaded] = useState<Loaded>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [dropped, setDropped] = useState<Dropped[]>([]);
  const [resets, setResets] = useState(0); // a reset redraws the fields, so typed numbers clear too

  useCancellableEffect(
    (isCurrent) => {
      if (!accessActive) return;
      setLoaded({ status: "loading" });
      gateway.allowedModels().then(
        (allowed) => {
          if (!isCurrent()) return;
          // Saved settings the Worker would now refuse (a lower cap, a model no longer allowed) are dropped, and said.
          const pruned = pruneSettings(devSettings.get(), allowed, MEASURED.map(({ name, setup }) => ({ name, model: setup.model })));
          if (pruned.dropped.length > 0) devSettings.set(() => pruned.settings);
          setDropped(pruned.dropped);
          setLoaded({ status: "ready", allowed });
        },
        () => isCurrent() && setLoaded({ status: "failed" }),
      );
    },
    [gateway, accessActive, attempt],
  );

  if (!accessActive) return <p className="dev-note">Enter an Access Token to load the Worker's models and limits.</p>;
  if (loaded.status === "failed") {
    return (
      <div role="alert" className="dev-problem">
        <p>Couldn't load the Worker's models and limits.</p>
        <button type="button" className="dev-link" onClick={() => setAttempt((n) => n + 1)}>
          Try again
        </button>
      </div>
    );
  }
  if (loaded.status === "loading") return <p className="dev-note">Loading the Worker's models…</p>;

  const { allowed } = loaded;
  const count = overrideCount(settings);
  const reset = (change: () => void) => {
    change();
    setResets((n) => n + 1);
  };
  return (
    <div className="dev-settings">
      {dropped.length > 0 && (
        <div className="dev-dropped" role="status">
          <p>Dropped {countOf(dropped.length, "saved setting")} the Worker no longer allows:</p>
          <ul>
            {dropped.map((d, i) => (
              <li key={i}>
                {jobName(d.job)}: {d.why}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="dev-jobs">
        {PANEL_JOBS.map(([key, name]) => (
          <button key={key} type="button" className="dev-chip" aria-pressed={job === key} onClick={() => setJob(key)}>
            {name}
          </button>
        ))}
      </div>
      {!(job in allowed.jobs) ? (
        <p className="dev-problem">The Worker has no settings for this job. Restart it, so it reads the current wrangler.jsonc.</p>
      ) : job === "matching" ? (
        <MatchingSettings key={resets} allowed={allowed} onReset={() => reset(() => devSettings.set((s) => ({ ...s, matchingSetup: null })))} />
      ) : (
        <JobSettings key={`${job}-${resets}`} job={job} allowed={allowed} onReset={() => reset(() => setJobOverride(job, () => ({})))} />
      )}
      <p className="dev-note">
        {allowed.pricesAt ? `Prices from OpenRouter's models endpoint, fetched at ${time(new Date(allowed.pricesAt))}.` : "OpenRouter's prices couldn't be read just now."}
      </p>
      {count > 0 && (
        <div className="dev-summary">
          <p>
            {countOf(count, "setting")} {count === 1 ? "overrides" : "override"} the Worker's defaults in this browser only.
          </p>
          <button type="button" className="dev-link" onClick={() => reset(() => devSettings.set((s) => ({ ...s, jobs: {}, matchingSetup: null })))}>
            Reset all
          </button>
        </div>
      )}
    </div>
  );
}

/** Changes one job's settings: `undefined` removes a setting, so the Worker's default applies again. */
function setJobOverride(job: ModelJob, change: (o: JobOverride) => JobOverride) {
  devSettings.set((s) => {
    const next = Object.fromEntries(Object.entries(change({ ...s.jobs[job] })).filter(([, v]) => v !== undefined)) as JobOverride;
    const jobs = { ...s.jobs, [job]: next };
    if (Object.keys(next).length === 0) delete jobs[job];
    return { ...s, jobs };
  });
}

/** Whole numbers from 1 up to the job's cap in the Worker, which is a ceiling. */
const withinCap = (cap: number) => (n: number) => (Number.isInteger(n) && n >= 1 && n <= cap ? null : `At most ${cap}, this job's cap in the Worker.`);

function JobSettings({ job, allowed, onReset }: { job: Exclude<PanelJob, "matching">; allowed: ModelsResponse; onReset: () => void }) {
  const settings = useDevSettings();
  const override = settings.jobs[job] ?? {};
  const defaults = allowed.jobs[job];
  const modelId = override.model ?? defaults.model;
  const model = allowed.models.find((m) => m.id === modelId) ?? { id: modelId, price: null, temperature: false, reasoning: false };

  function pickModel(id: string) {
    const picked = allowed.models.find((m) => m.id === id);
    setJobOverride(job, (o) => ({
      ...o,
      model: id === defaults.model ? undefined : id,
      temperature: picked?.temperature ? o.temperature : undefined, // only for a model that takes one
      reasoningEffort: picked?.reasoning ? o.reasoningEffort : undefined,
    }));
  }

  return (
    <div className="dev-fields">
      <Field label="Model" changed={override.model !== undefined} wide>
        {(id) => (
          <select id={id} className="dev-input" value={modelId} onChange={(e) => pickModel(e.target.value)}>
            {allowed.models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id} · {priceOf(m)}
              </option>
            ))}
          </select>
        )}
      </Field>
      <FixedSetting label="Prompt Variant">one prompt</FixedSetting>
      <NumberSetting
        key={`temperature-${modelId}`}
        label="Temperature"
        value={override.temperature}
        disabled={!model.temperature}
        why={model.temperature ? null : `${modelId} doesn't take a temperature; reasoning effort is its setting.`}
        placeholder="model default"
        check={(n) => (n >= 0 && n <= 2 ? null : "Between 0 and 2.")}
        step={0.1}
        onSave={(temperature) => setJobOverride(job, (o) => ({ ...o, temperature }))}
      />
      <NumberSetting
        label="Max tokens"
        value={override.maxTokens}
        placeholder={String(defaults.maxTokens)}
        check={withinCap(defaults.maxTokens)}
        step={1}
        onSave={(maxTokens) => setJobOverride(job, (o) => ({ ...o, maxTokens }))}
      />
      <Field label="Reasoning effort" changed={override.reasoningEffort !== undefined} why={model.reasoning ? null : `${modelId} takes no reasoning effort.`}>
        {(id) => (
          <select
            id={id}
            className="dev-input"
            disabled={!model.reasoning}
            value={override.reasoningEffort ?? defaults.reasoningEffort}
            onChange={(e) => {
              const effort = e.target.value as ReasoningEffort;
              setJobOverride(job, (o) => ({ ...o, reasoningEffort: effort === defaults.reasoningEffort ? undefined : effort }));
            }}
          >
            {REASONING_EFFORTS.map((effort) => (
              <option key={effort} value={effort}>
                {effort}
              </option>
            ))}
          </select>
        )}
      </Field>
      <button type="button" className="dev-link" onClick={onReset}>
        Reset {jobName(job)} to its defaults
      </button>
    </div>
  );
}

/** Matching's Setup is picked whole from those the Matcher Report measured, and runs exactly as measured (the job's
 * full cap, no temperature), so its Gap threshold holds. */
function MatchingSettings({ allowed, onReset }: { allowed: ModelsResponse; onReset: () => void }) {
  const settings = useDevSettings();
  const offered = MEASURED.filter((m) => allowed.models.some((model) => model.id === m.setup.model));
  const current = settings.matchingSetup ?? SHIPPED_SETUP?.name ?? "";

  return (
    <div className="dev-fields">
      <Field label="Setup" changed={settings.matchingSetup !== null} wide>
        {(id) => (
          <select
            id={id}
            className="dev-input"
            value={current}
            onChange={(e) => {
              const name = e.target.value;
              devSettings.set((s) => ({ ...s, matchingSetup: name === SHIPPED_SETUP?.name ? null : name }));
            }}
          >
            {offered.map((m) => (
              <option key={m.name} value={m.name}>
                {PROMPT_VARIANTS[m.setup.promptVariant].name} · {m.setup.model} · {m.setup.reasoningEffort} effort — threshold {m.gapThreshold}
              </option>
            ))}
          </select>
        )}
      </Field>
      <FixedSetting label="Temperature and max tokens" wide>
        As measured: no temperature, and the job's full cap of {allowed.jobs.matching.maxTokens}, so the Setup's threshold holds.
      </FixedSetting>
      <button type="button" className="dev-link" onClick={onReset}>
        Reset Matching to its defaults
      </button>
    </div>
  );
}

function Field({ label, changed = false, why = null, wide = false, children }: { label: string; changed?: boolean; why?: string | null; wide?: boolean; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div className={`dev-field${wide ? " is-wide" : ""}${changed ? " is-changed" : ""}`}>
      <span className="dev-label">
        <label htmlFor={id}>{label}</label>
        {changed && <span className="dev-changed"> · changed</span>}
      </span>
      {children(id)}
      {why && <span className="dev-why">{why}</span>}
    </div>
  );
}

/** A setting that can't be changed here, and why or what it is. */
function FixedSetting({ label, wide = false, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={`dev-field${wide ? " is-wide" : ""}`}>
      <span className="dev-label">{label}</span>
      <span className="dev-fixed">{children}</span>
    </div>
  );
}

/** A number setting, typed freely: a valid number is saved as it's typed, an empty box means the default, and anything
 * else says why and removes the setting. */
function NumberSetting({ label, value, disabled = false, why = null, placeholder, check, step, onSave }: {
  label: string;
  value: number | undefined;
  disabled?: boolean;
  why?: string | null;
  placeholder: string;
  check: (n: number) => string | null;
  step: number;
  onSave: (value: number | undefined) => void;
}) {
  const [text, setText] = useState(value === undefined ? "" : String(value));
  const [problem, setProblem] = useState<string | null>(null);
  return (
    <Field label={label} changed={value !== undefined} why={problem ?? why}>
      {(id) => (
        <input
          id={id}
          className="dev-input"
          type="number"
          step={step}
          min={0}
          inputMode="decimal"
          disabled={disabled}
          placeholder={placeholder}
          aria-invalid={problem !== null}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (e.target.value.trim() === "") return (setProblem(null), onSave(undefined));
            const n = Number(e.target.value);
            const found = Number.isFinite(n) ? check(n) : "Not a number.";
            setProblem(found);
            onSave(found ? undefined : n);
          }}
        />
      )}
    </Field>
  );
}
