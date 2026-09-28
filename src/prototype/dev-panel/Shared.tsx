// PROTOTYPE — pieces every Developer panel variant uses: one job's settings form, and the call log.
import { MODELS, PRICES_FETCHED, VARIANTS, fmtCost, jobName, totalCost, type Dev, type Effort, type JobKey } from "./dev";

export function JobForm({ dev, job, compact }: { dev: Dev; job: JobKey; compact?: boolean }) {
  const s = dev.settings[job];
  const o = (f: Parameters<Dev["isOverridden"]>[1]) => (dev.isOverridden(job, f) ? "is-over" : "");
  const model = MODELS.find((m) => m.id === s.model)!;
  return (
    <div className={`dp-form ${compact ? "is-compact" : ""}`}>
      <label className={`dp-field ${o("model")}`}>
        <span>Model</span>
        <select value={s.model} onChange={(e) => dev.set(job, { model: e.target.value })}>
          {MODELS.map((m) => <option key={m.id} value={m.id}>{m.id} — ${m.input} / ${m.output}</option>)}
        </select>
      </label>
      <label className={`dp-field ${o("variant")}`}>
        <span>Prompt Variant</span>
        <select value={s.variant} onChange={(e) => dev.set(job, { variant: e.target.value })}>
          {VARIANTS.map((v) => <option key={v}>{v}</option>)}
        </select>
      </label>
      <label className={`dp-field ${o("temperature")}`}>
        <span>Temperature <b>{s.temperature.toFixed(1)}</b></span>
        <input type="range" min={0} max={1.5} step={0.1} value={s.temperature} onChange={(e) => dev.set(job, { temperature: Number(e.target.value) })} />
      </label>
      <label className={`dp-field ${o("maxTokens")}`}>
        <span>Max tokens</span>
        <input type="number" min={50} max={8000} step={50} value={s.maxTokens} onChange={(e) => dev.set(job, { maxTokens: Number(e.target.value) })} />
      </label>
      <label className={`dp-field ${o("effort")} ${model.reasoning ? "" : "is-off"}`}>
        <span>Reasoning effort{!model.reasoning && " (not supported)"}</span>
        <select value={s.effort} disabled={!model.reasoning} onChange={(e) => dev.set(job, { effort: e.target.value as Effort })}>
          {(["minimal", "low", "medium", "high"] as const).map((v) => <option key={v}>{v}</option>)}
        </select>
      </label>
      <div className="dp-form-actions">
        <button className="dp-btn" onClick={() => dev.simulate(job)}>Simulate a call</button>
        <button className="dp-link" onClick={() => dev.reset(job)}>Reset to defaults</button>
      </div>
    </div>
  );
}

export function CallLog({ dev, limit }: { dev: Dev; limit?: number }) {
  const rows = limit ? dev.calls.slice(0, limit) : dev.calls;
  return (
    <div className="dp-log">
      <ol className="dp-calls">
        {rows.map((c) => (
          <li key={c.id}>
            <div className="dp-call-top">
              <span><b>{jobName(c.job)}</b> · {c.model.replace("openai/", "").replace("meta-llama/", "")} · {c.variant}</span>
              <span className="dp-call-cost">{fmtCost(c.cost)}</span>
            </div>
            <div className="dp-sub">{c.tokensIn.toLocaleString()} → {c.tokensOut.toLocaleString()} tokens · {(c.ms / 1000).toFixed(1)}s · {c.when}</div>
          </li>
        ))}
      </ol>
      <div className="dp-call-total"><span>{dev.calls.length} calls this session</span><span>{fmtCost(totalCost(dev.calls))}</span></div>
      <div className="dp-fine">Prices from OpenRouter's models endpoint, fetched {PRICES_FETCHED}. Tokens and cost only — no prompt or reply text is kept.</div>
    </div>
  );
}

export function OverrideNote({ dev }: { dev: Dev }) {
  const n = (Object.keys(dev.settings) as JobKey[]).reduce((k, j) => k + (["model", "variant", "temperature", "maxTokens", "effort"] as const).filter((f) => dev.isOverridden(j, f)).length, 0);
  return (
    <div className="dp-note">
      {n ? <><b>{n} {n === 1 ? "setting overrides" : "settings override"}</b> the config defaults in this browser only. <button className="dp-link" onClick={() => dev.reset()}>Reset all</button></> : "Using the config defaults. Changes apply to this browser only."}
    </div>
  );
}
