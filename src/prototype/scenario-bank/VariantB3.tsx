// PROTOTYPE — Variant B3: skills first. The page opens with what your stories cover: each skill with how many
// stories show it, and the skills your Interviews asked for that no story covers yet (the Gaps), each with a
// "write one" shortcut. Below, stories are compact rows that expand in place to read or edit.
import { useState } from "react";
import { allTags, blank, type Bank } from "./data";
import { NewStoryChoice, OriginBadge, ScenarioForm, ScenarioReader, Tags, confirmDelete } from "./Shared";

// Skills your Interviews' Gaps asked for (from the dashboard's sample data).
const GAP_SKILLS = ["legacy systems", "prioritisation", "hiring"];

export function VariantB3({ bank }: { bank: Bank }) {
  const params = new URLSearchParams(location.search);
  const [openId, setOpenId] = useState<string | null>(params.get("mode") === "read" || params.get("mode") === "edit" ? bank.scenarios[0]?.id ?? null : null);
  const [editing, setEditing] = useState(params.get("mode") === "edit");
  const [adding, setAdding] = useState<"choose" | "new" | null>(params.get("mode") === "choose" || params.get("mode") === "new" ? (params.get("mode") as "choose" | "new") : null);
  const [skill, setSkill] = useState<string | null>(null);
  const [allSkills, setAllSkills] = useState(false);
  const tags = allTags(bank.scenarios);
  const max = Math.max(1, ...tags.map(([, n]) => n));
  const list = bank.scenarios.filter((s) => !skill || s.tags.includes(skill));
  const demo = bank.scenarios.filter((s) => s.origin === "demo").length;

  return (
    <main className="d2-main b3">
      <div className="b3-top">
        <section className="b3-panel">
          <h2 className="b3-h">Skills your stories cover</h2>
          {tags.length === 0 && <div className="sb-empty">No stories yet.</div>}
          <ul className="b3-skills">
            {(allSkills ? tags : tags.slice(0, 5)).map(([t, n]) => (
              <li key={t}>
                <button className={skill === t ? "is-on" : ""} onClick={() => setSkill(skill === t ? null : t)}>
                  <span className="b3-skill-name">{t}</span>
                  <span className="b3-bar"><span style={{ width: `${(n / max) * 100}%` }} /></span>
                  <span className="b3-n">{n}</span>
                </button>
              </li>
            ))}
          </ul>
          {tags.length > 5 && <button className="sb-link b3-more" onClick={() => setAllSkills((v) => !v)}>{allSkills ? "Show fewer" : `Show all ${tags.length} skills`}</button>}
        </section>
        <section className="b3-panel b3-gaps">
          <h2 className="b3-h">Not covered yet</h2>
          <p className="b3-sub">Your Interviews asked about these, and no story fits.</p>
          <ul className="b3-gap-list">
            {GAP_SKILLS.map((g) => (
              <li key={g}><span>{g}</span><button className="sb-secondary" onClick={() => { setAdding("choose"); setOpenId(null); }}>Write one</button></li>
            ))}
          </ul>
        </section>
      </div>

      <div className="b3-list-head">
        <h1>{skill ? `Stories showing “${skill}”` : "All stories"} <span>{list.length}</span></h1>
        <span className="b3-list-actions">
          {skill && <button className="sb-link" onClick={() => setSkill(null)}>Show all</button>}
          {demo > 0 && <button className="sb-link" onClick={bank.removeDemo}>Remove {demo} demo</button>}
          <button className="sb-primary" onClick={() => { setAdding("choose"); setOpenId(null); }}>+ New story</button>
        </span>
      </div>

      {adding && (
        <div className="b3-row is-open b3-adding">
          {adding === "choose" ? (
            <NewStoryChoice onHand={() => setAdding("new")} onCancel={() => setAdding(null)} />
          ) : (
            <ScenarioForm initial={blank()} onSave={(s) => { bank.save(s); setAdding(null); setOpenId(s.id); }} onCancel={() => setAdding(null)} />
          )}
        </div>
      )}

      <ul className="b3-rows">
        {list.map((s) => {
          const open = openId === s.id;
          return (
            <li key={s.id} className={`b3-row ${open ? "is-open" : ""}`}>
              <button className="b3-row-head" onClick={() => { setOpenId(open ? null : s.id); setEditing(false); }} aria-expanded={open}>
                <span className="b3-caret">{open ? "▾" : "▸"}</span>
                <span className="b3-row-title">{s.title}</span>
                <Tags tags={s.tags} />
                <OriginBadge origin={s.origin} />
                <span className="b3-row-used">{s.usedIn.length ? `picked in ${s.usedIn.length}` : "—"}</span>
                <span className="b3-row-edited">{s.edited}</span>
              </button>
              {open && (
                <div className="b3-row-body">
                  {editing ? (
                    <ScenarioForm initial={s} onSave={(x) => { bank.save(x); setEditing(false); }} onCancel={() => setEditing(false)} />
                  ) : (
                    <>
                      <ScenarioReader s={s} />
                      <div className="b3-row-actions">
                        <button className="sb-secondary" onClick={() => setEditing(true)}>Edit</button>
                        <button className="sb-link" onClick={() => { if (confirmDelete(s)) bank.remove(s.id); }}>Delete</button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
