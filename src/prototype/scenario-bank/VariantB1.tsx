// PROTOTYPE — Variant B1: list and reading pane. Stories listed on the left (search, origin, where they're picked);
// the selected one reads in full on the right, where Edit turns the pane into the form. On a phone the list and
// the pane are two screens.
import { useState } from "react";
import { blank, type Bank } from "./data";
import { NewStoryChoice, OriginBadge, ScenarioForm, ScenarioReader, Tags, confirmDelete } from "./Shared";

type Mode = "read" | "edit" | "choose" | "new";

export function VariantB1({ bank }: { bank: Bank }) {
  const params = new URLSearchParams(location.search);
  const [selectedId, setSelectedId] = useState<string | null>(bank.scenarios[0]?.id ?? null);
  const [mode, setMode] = useState<Mode>((params.get("mode") as Mode) ?? "read");
  const [query, setQuery] = useState("");
  const [paneOpen, setPaneOpen] = useState(params.has("mode")); // phone: pane shown instead of list
  const list = bank.scenarios.filter((s) => (s.title + s.tags.join(" ")).toLowerCase().includes(query.toLowerCase()));
  const selected = bank.scenarios.find((s) => s.id === selectedId);
  const demo = bank.scenarios.filter((s) => s.origin === "demo").length;
  const open = (m: Mode, id?: string) => { if (id) setSelectedId(id); setMode(m); setPaneOpen(true); };

  return (
    <main className="d2-main b1">
      <aside className={`b1-list ${paneOpen ? "is-hidden-phone" : ""}`}>
        <div className="b1-list-head">
          <h1>Scenario Bank</h1>
          <button className="sb-primary" onClick={() => open("choose")}>+ New story</button>
        </div>
        <input className="sb-input b1-search" placeholder="Search titles and skills" value={query} onChange={(e) => setQuery(e.target.value)} />
        {demo > 0 && (
          <div className="sb-demo-bar">{demo} demo {demo === 1 ? "story" : "stories"} · <button className="sb-link" onClick={bank.removeDemo}>Remove all demo</button></div>
        )}
        {bank.scenarios.length === 0 && <div className="sb-empty">No stories yet. Add your first real story from your career.</div>}
        <ul className="b1-items">
          {list.map((s) => (
            <li key={s.id}>
              <button className={`b1-item ${s.id === selectedId && mode !== "choose" && mode !== "new" ? "is-on" : ""}`} onClick={() => open("read", s.id)}>
                <span className="b1-item-title">{s.title}</span>
                <Tags tags={s.tags} />
                <span className="b1-item-meta">
                  <OriginBadge origin={s.origin} />
                  {s.usedIn.length > 0 && <span>picked in {s.usedIn.length}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className={`b1-pane ${paneOpen ? "" : "is-hidden-phone"}`}>
        <button className="sb-link b1-back" onClick={() => setPaneOpen(false)}>← All stories</button>
        {mode === "choose" ? (
          <>
            <h2 className="sb-h">Add a story</h2>
            <NewStoryChoice onHand={() => setMode("new")} onCancel={() => { setMode("read"); setPaneOpen(false); }} />
          </>
        ) : mode === "new" ? (
          <>
            <h2 className="sb-h">New story</h2>
            <ScenarioForm initial={blank()} onSave={(s) => { bank.save(s); setSelectedId(s.id); setMode("read"); }} onCancel={() => setMode("read")} />
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
    </main>
  );
}
