// PROTOTYPE — round 2: B1 (list and reading pane) as the core, with B3's skills overview on top. The core is the
// same in every variant; only where the overview sits changes:
//   above  — B3's two panels full width above the list and pane
//   column — a compact overview in the left column, above the list, so the reading pane stays in view
//   strip  — a one-line summary that opens into the full panels
//   top    — the compact overview (as in column) across the top, shown by default, with a Hide toggle that
//            folds it into the one-line summary
// Clicking a skill filters the list; "Write one" on an uncovered skill starts a new story tagged with it.
import { useState } from "react";
import { allTags, blank, type Bank, type Scenario } from "./data";
import { NewStoryChoice, OriginBadge, ScenarioForm, ScenarioReader, Tags, confirmDelete } from "./Shared";

// Skills your Interviews' Gaps asked for (from the dashboard's sample data).
const GAP_SKILLS = ["legacy systems", "prioritisation", "hiring"];

type Placement = "above" | "column" | "strip" | "top";
type Mode = "read" | "edit" | "choose" | "new";

function SkillsOverview({ bank, skill, onSkill, onWrite, compact }: {
  bank: Bank; skill: string | null; onSkill: (s: string | null) => void; onWrite: (gap: string) => void; compact?: boolean;
}) {
  const [all, setAll] = useState(false);
  const tags = allTags(bank.scenarios);
  const max = Math.max(1, ...tags.map(([, n]) => n));
  const limit = compact ? 4 : 5;
  const shown = all ? tags : tags.slice(0, limit);
  return (
    <div className={`cb-overview ${compact ? "is-compact" : ""}`}>
      <section className="b3-panel">
        <h2 className="b3-h">Skills your stories cover</h2>
        {tags.length === 0 && <div className="sb-empty">No stories yet.</div>}
        <ul className="b3-skills">
          {shown.map(([t, n]) => (
            <li key={t}>
              <button className={skill === t ? "is-on" : ""} onClick={() => onSkill(skill === t ? null : t)}>
                <span className="b3-skill-name">{t}</span>
                <span className="b3-bar"><span style={{ width: `${(n / max) * 100}%` }} /></span>
                <span className="b3-n">{n}</span>
              </button>
            </li>
          ))}
        </ul>
        {tags.length > limit && <button className="sb-link b3-more" onClick={() => setAll((v) => !v)}>{all ? "Show fewer" : `Show all ${tags.length} skills`}</button>}
      </section>
      <section className="b3-panel b3-gaps">
        <h2 className="b3-h">Not covered yet</h2>
        {!compact && <p className="b3-sub">Your Interviews asked about these, and no story fits.</p>}
        {compact ? (
          <div className="cb-gap-chips">
            {GAP_SKILLS.map((g) => <button key={g} onClick={() => onWrite(g)} title="Write a story for this skill">{g} <span>+</span></button>)}
          </div>
        ) : (
          <ul className="b3-gap-list">
            {GAP_SKILLS.map((g) => <li key={g}><span>{g}</span><button className="sb-secondary" onClick={() => onWrite(g)}>Write one</button></li>)}
          </ul>
        )}
      </section>
    </div>
  );
}

export function CombinedBank({ bank, placement }: { bank: Bank; placement: Placement }) {
  const params = new URLSearchParams(location.search);
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const s = new URLSearchParams(location.search).get("skill");
    return (bank.scenarios.find((x) => !s || x.tags.includes(s)) ?? bank.scenarios[0])?.id ?? null;
  });
  const [mode, setMode] = useState<Mode>((params.get("mode") as Mode) ?? "read");
  const [draft, setDraft] = useState<Scenario>(blank);
  const [query, setQuery] = useState("");
  const [skill, setSkill] = useState<string | null>(params.get("skill"));
  const [stripOpen, setStripOpen] = useState(params.has("open"));
  const [topShown, setTopShown] = useState(!params.has("hidden"));
  const [paneOpen, setPaneOpen] = useState(params.has("mode")); // phone: pane shown instead of list

  const list = bank.scenarios.filter((s) => (!skill || s.tags.includes(skill)) && (s.title + s.tags.join(" ")).toLowerCase().includes(query.toLowerCase()));
  const selected = bank.scenarios.find((s) => s.id === selectedId);
  const demo = bank.scenarios.filter((s) => s.origin === "demo").length;
  const open = (m: Mode, id?: string) => { if (id) setSelectedId(id); setMode(m); setPaneOpen(true); };
  const write = (gap: string) => { setDraft({ ...blank(), tags: [gap] }); open("choose"); };
  const tagCount = allTags(bank.scenarios).length;
  // Filtering by a skill also selects its first story, so the pane never shows one that's filtered out.
  const filterBy = (s: string | null) => {
    setSkill(s);
    const first = bank.scenarios.find((x) => !s || x.tags.includes(s));
    if (s && first && !selected?.tags.includes(s)) { setSelectedId(first.id); setMode("read"); }
  };
  const overview = <SkillsOverview bank={bank} skill={skill} onSkill={filterBy} onWrite={write} compact={placement === "column" || placement === "top"} />;

  return (
    <main className={`d2-main cb cb-${placement}`}>
      {placement === "above" && <div className={paneOpen ? "is-hidden-phone" : ""}>{overview}</div>}
      {placement === "strip" && (
        <div className={`cb-strip ${paneOpen ? "is-hidden-phone" : ""}`}>
          <button className="cb-strip-bar" onClick={() => setStripOpen((v) => !v)} aria-expanded={stripOpen}>
            <span><strong>{tagCount}</strong> skills covered</span>
            <span className="cb-strip-gaps"><strong>{GAP_SKILLS.length}</strong> not covered yet: {GAP_SKILLS.join(", ")}</span>
            <span className="cb-strip-toggle">{stripOpen ? "Hide ▴" : "Skills overview ▾"}</span>
          </button>
          {stripOpen && overview}
        </div>
      )}

      {placement === "top" && (
        <div className={`cb-top ${paneOpen ? "is-hidden-phone" : ""}`}>
          {topShown ? (
            <>
              <div className="cb-top-head">
                <span className="cb-top-title">Skills overview</span>
                <button className="sb-link" onClick={() => setTopShown(false)} aria-expanded="true">Hide ▴</button>
              </div>
              {overview}
            </>
          ) : (
            <button className="cb-strip-bar cb-mini" onClick={() => setTopShown(true)} aria-expanded="false">
              <span><strong>{tagCount}</strong> skills covered</span>
              <span className="cb-strip-gaps"><strong>{GAP_SKILLS.length}</strong> not covered yet</span>
              <span className="cb-strip-toggle">Show ▾</span>
            </button>
          )}
        </div>
      )}

      <div className="b1">
        <aside className={`b1-list ${paneOpen ? "is-hidden-phone" : ""}`}>
          <div className="b1-list-head">
            <h1>Scenario Bank</h1>
            <button className="sb-primary" onClick={() => { setDraft(blank()); open("choose"); }}>+ New story</button>
          </div>
          {placement === "column" && overview}
          <input className="sb-input b1-search" placeholder="Search titles and skills" value={query} onChange={(e) => setQuery(e.target.value)} />
          {skill && <div className="cb-filter">Showing stories with <strong>{skill}</strong> · <button className="sb-link" onClick={() => setSkill(null)}>Show all</button></div>}
          {demo > 0 && <div className="sb-demo-bar">{demo} demo {demo === 1 ? "story" : "stories"} · <button className="sb-link" onClick={bank.removeDemo}>Remove all demo</button></div>}
          {bank.scenarios.length === 0 && <div className="sb-empty">No stories yet. Add your first real story from your career.</div>}
          <ul className="b1-items">
            {list.map((s) => (
              <li key={s.id}>
                <button className={`b1-item ${s.id === selectedId && (mode === "read" || mode === "edit") ? "is-on" : ""}`} onClick={() => open("read", s.id)}>
                  <span className="b1-item-title">{s.title}</span>
                  <Tags tags={s.tags} />
                  <span className="b1-item-meta"><OriginBadge origin={s.origin} />{s.usedIn.length > 0 && <span>picked in {s.usedIn.length}</span>}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className={`b1-pane ${paneOpen ? "" : "is-hidden-phone"}`}>
          <button className="sb-link b1-back" onClick={() => setPaneOpen(false)}>← All stories</button>
          {mode === "choose" ? (
            <>
              <h2 className="sb-h">Add a story{draft.tags[0] ? ` about ${draft.tags[0]}` : ""}</h2>
              <NewStoryChoice onHand={() => setMode("new")} onCancel={() => { setMode("read"); setPaneOpen(false); }} />
            </>
          ) : mode === "new" ? (
            <>
              <h2 className="sb-h">New story</h2>
              <ScenarioForm key={draft.id} initial={draft} onSave={(s) => { bank.save(s); setSelectedId(s.id); setMode("read"); }} onCancel={() => setMode("read")} />
            </>
          ) : selected ? (
            mode === "edit" ? (
              <>
                <h2 className="sb-h">Edit story</h2>
                <ScenarioForm key={selected.id} initial={selected} onSave={(s) => { bank.save(s); setMode("read"); }} onCancel={() => setMode("read")} />
              </>
            ) : (
              <>
                <div className="b1-pane-head">
                  <h2 className="sb-h">{selected.title}</h2>
                  <span className="b1-pane-actions">
                    <button className="sb-secondary" onClick={() => setMode("edit")}>Edit</button>
                    <button className="sb-link" onClick={() => { if (confirmDelete(selected)) { bank.remove(selected.id); setSelectedId(null); setPaneOpen(false); } }}>Delete</button>
                  </span>
                </div>
                <ScenarioReader s={selected} />
              </>
            )
          ) : (
            <div className="sb-empty">Pick a story on the left to read it.</div>
          )}
        </section>
      </div>
    </main>
  );
}
