// PROTOTYPE — three Developer panel layouts over the Candidate's screen (here, the S3 Interview view):
//   P1 — side drawer: tabs for Settings (one job at a time) and Calls
//   P2 — bottom dock, like browser devtools: a slim bar with the last call and session cost; expands into
//        a settings table (jobs as rows) beside the call log
//   P3 — floating pill: a small cost counter; opening it shows a compact popover per job; every call pops a toast
import { useEffect, useRef, useState } from "react";
import { JOBS, fmtCost, jobName, totalCost, type Dev, type JobKey } from "./dev";
import { CallLog, JobForm, OverrideNote } from "./Shared";

const openParam = () => new URLSearchParams(location.search).has("open");

export function P1Drawer({ dev }: { dev: Dev }) {
  const [open, setOpen] = useState(openParam);
  const [tab, setTab] = useState<"settings" | "calls">(() => (new URLSearchParams(location.search).get("tab") === "calls" ? "calls" : "settings"));
  const [job, setJob] = useState<JobKey>("matching");
  return (
    <>
      <button className="dp-tab-handle" onClick={() => setOpen(true)}>DEV</button>
      {open && (
        <aside className="dp-drawer">
          <div className="dp-head"><strong>Developer</strong><span className="dp-total">{fmtCost(totalCost(dev.calls))} this session</span><button className="dp-x" onClick={() => setOpen(false)} aria-label="Close">×</button></div>
          <div className="dp-tabs">
            <button className={tab === "settings" ? "is-on" : ""} onClick={() => setTab("settings")}>Settings</button>
            <button className={tab === "calls" ? "is-on" : ""} onClick={() => setTab("calls")}>Calls <span>{dev.calls.length}</span></button>
          </div>
          {tab === "settings" ? (
            <>
              <div className="dp-jobs">
                {JOBS.map((j) => <button key={j.key} className={job === j.key ? "is-on" : ""} onClick={() => setJob(j.key)}>{j.name}</button>)}
              </div>
              <div className="dp-what">{JOBS.find((j) => j.key === job)!.what}</div>
              <JobForm dev={dev} job={job} />
              <OverrideNote dev={dev} />
            </>
          ) : (
            <CallLog dev={dev} />
          )}
        </aside>
      )}
    </>
  );
}

export function P2Dock({ dev }: { dev: Dev }) {
  const [open, setOpen] = useState(openParam);
  const last = dev.calls[0];
  return (
    <div className={`dp-dock ${open ? "is-open" : ""}`}>
      <button className="dp-dock-bar" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="dp-dock-tag">DEV</span>
        {last && <span className="dp-dock-last">Last: {jobName(last.job)} · {last.model.replace("openai/", "")} · {last.tokensIn.toLocaleString()}→{last.tokensOut.toLocaleString()} tokens · <b>{fmtCost(last.cost)}</b></span>}
        <span className="dp-dock-total">Session {fmtCost(totalCost(dev.calls))}</span>
        <span className="dp-dock-toggle">{open ? "▾" : "▴"}</span>
      </button>
      {open && (
        <div className="dp-dock-body">
          <section className="dp-matrix">
            <div className="dp-matrix-row dp-matrix-th"><span>Job</span><span>Model</span><span>Variant</span><span>Temp</span><span>Max</span><span>Effort</span><span /></div>
            {JOBS.map((j) => <MatrixRow key={j.key} dev={dev} job={j.key} />)}
            <OverrideNote dev={dev} />
          </section>
          <section className="dp-dock-log"><CallLog dev={dev} limit={8} /></section>
        </div>
      )}
    </div>
  );
}

function MatrixRow({ dev, job }: { dev: Dev; job: JobKey }) {
  const s = dev.settings[job];
  const o = (f: Parameters<Dev["isOverridden"]>[1]) => (dev.isOverridden(job, f) ? "is-over" : "");
  return (
    <div className="dp-matrix-row">
      <span className="dp-matrix-job">{jobName(job)}</span>
      <select className={o("model")} value={s.model} onChange={(e) => dev.set(job, { model: e.target.value })}>
        {["openai/gpt-5-nano", "openai/gpt-5-mini", "openai/gpt-5", "meta-llama/llama-3.3-70b-instruct"].map((m) => <option key={m} value={m}>{m.replace("openai/", "").replace("meta-llama/", "")}</option>)}
      </select>
      <select className={o("variant")} value={s.variant} onChange={(e) => dev.set(job, { variant: e.target.value })}>
        {["zero-shot", "few-shot", "chain-of-thought", "role prompt", "structured output"].map((v) => <option key={v}>{v}</option>)}
      </select>
      <input className={o("temperature")} type="number" step={0.1} min={0} max={1.5} value={s.temperature} onChange={(e) => dev.set(job, { temperature: Number(e.target.value) })} />
      <input className={o("maxTokens")} type="number" step={50} value={s.maxTokens} onChange={(e) => dev.set(job, { maxTokens: Number(e.target.value) })} />
      <select className={o("effort")} value={s.effort} disabled={s.model.startsWith("meta-llama")} onChange={(e) => dev.set(job, { effort: e.target.value as typeof s.effort })}>
        {["minimal", "low", "medium", "high"].map((v) => <option key={v}>{v}</option>)}
      </select>
      <button className="dp-btn is-small" onClick={() => dev.simulate(job)}>Run</button>
    </div>
  );
}

export function P3Pill({ dev }: { dev: Dev }) {
  const [open, setOpen] = useState(openParam);
  const [job, setJob] = useState<JobKey>("matching");
  const [toast, setToast] = useState<string | null>(null);
  const seen = useRef(dev.calls.length);
  useEffect(() => {
    if (dev.calls.length <= seen.current) return;
    seen.current = dev.calls.length;
    const c = dev.calls[0];
    setToast(`${jobName(c.job)} · ${c.model.replace("openai/", "")} · ${c.tokensIn.toLocaleString()}→${c.tokensOut.toLocaleString()} · ${fmtCost(c.cost)}`);
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [dev.calls]);

  return (
    <>
      {toast && <div className="dp-toast">{toast}</div>}
      <button className="dp-pill" onClick={() => setOpen((o) => !o)} aria-expanded={open}>DEV · {fmtCost(totalCost(dev.calls))}</button>
      {open && (
        <div className="dp-pop">
          <div className="dp-jobs">
            {JOBS.map((j) => <button key={j.key} className={job === j.key ? "is-on" : ""} onClick={() => setJob(j.key)}>{j.name}</button>)}
          </div>
          <JobForm dev={dev} job={job} compact />
          <div className="dp-pop-foot">
            <OverrideNote dev={dev} />
            <span className="dp-fine">{dev.calls.length} calls · last {dev.calls[0] ? fmtCost(dev.calls[0].cost) : "—"}</span>
          </div>
        </div>
      )}
    </>
  );
}
