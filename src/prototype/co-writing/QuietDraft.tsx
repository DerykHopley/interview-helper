// PROTOTYPE — round 2: W2's chat-with-draft, with the draft made much less dominant. The chat is the main thing
// in every variant; only how the draft is shown alongside it changes:
//   rail   — W4: a slim rail beside the chat, one line per part (tick + first words); click a line to read it
//   strip  — W5: a row of part chips above the chat; click one to peek at the words it holds
//   drawer — W6: no draft on screen, just a "Draft 4/7" button that opens it as a side drawer; each reply
//            shows a small "→ added to Situation" tag instead
// In all three the full draft only takes over at the end, as the review.
import { useEffect, useRef, useState } from "react";
import { PARTS, useCowrite, type Cowrite, type Seed } from "./cowrite";
import { Bubble, DraftReview, Reply, RulesNote } from "./Shared";

type Mode = "rail" | "strip" | "drawer";

const valueOf = (cw: Cowrite, key: string) => String(cw.draft[key as keyof typeof cw.draft] ?? "").trim();
const isCurrent = (cw: Cowrite, key: string) => cw.stage === key || (key === "title" && cw.stage === "about");

function PartLines({ cw, open, setOpen }: { cw: Cowrite; open: string | null; setOpen: (k: string | null) => void }) {
  return (
    <ul className="qd-lines">
      {PARTS.map((p) => {
        const v = valueOf(cw, p.key);
        const cur = isCurrent(cw, p.key);
        return (
          <li key={p.key}>
            <button className={`qd-line ${v ? "is-filled" : ""} ${cur ? "is-current" : ""}`} onClick={() => setOpen(open === p.key ? null : p.key)} disabled={!v}>
              <span className="qd-tick">{v ? "✓" : cur ? "•" : ""}</span>
              <span className="qd-line-k">{p.label}</span>
              {open === p.key ? <span className="qd-line-full">{v}</span> : <span className="qd-line-v">{v || (cur ? "answering…" : "")}</span>}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function QuietDraft({ seed, onRestart, mode }: { seed: Seed; onRestart: () => void; mode: Mode }) {
  const cw = useCowrite(seed);
  const [open, setOpen] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(() => new URLSearchParams(location.search).has("drawer"));
  const thread = useRef<HTMLDivElement>(null);
  // W5: once the chips scroll out of view, pin them to the top of the screen (sticky doesn't work inside
  // the dashboard, which clips sideways overflow). A placeholder keeps their space so the page doesn't jump.
  const stripSlot = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);
  const [slotHeight, setSlotHeight] = useState(0);
  useEffect(() => {
    if (mode !== "strip") return;
    const onScroll = () => {
      const el = stripSlot.current;
      if (!el) return;
      setSlotHeight(el.firstElementChild?.getBoundingClientRect().height ?? 0);
      // ?stuck=1 shows the pinned state without scrolling (for screenshots)
      setStuck(el.getBoundingClientRect().top < 0 || new URLSearchParams(location.search).has("stuck"));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }, [mode]);
  useEffect(() => {
    if (mode === "strip") {
      // W5: the page scrolls (reply box is fixed), so follow the newest message with the window.
      window.scrollTo({ top: document.body.scrollHeight, behavior: cw.messages.length > 2 ? "smooth" : "auto" });
      return;
    }
    const el = thread.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [cw.messages.length, mode]);
  // When the draft is ready, bring the review to the top of the page.
  useEffect(() => { if (cw.done) window.scrollTo({ top: 0 }); }, [cw.done]);
  const filled = PARTS.filter((p) => valueOf(cw, p.key)).length;

  if (cw.done)
    return (
      <main className="d2-main qd qd-done">
        <DraftReview cw={cw} seed={seed} onRestart={onRestart} />
      </main>
    );

  const chat = (
    <section className="qd-chat">
      <div className="qd-head">
        <h1>{seed.kind === "gap" ? "Write a story for this Gap" : "Co-write a story"}</h1>
        {mode === "drawer" && (
          <button className="qd-draft-btn" onClick={() => setDrawer(true)}>Draft <strong>{filled}/{PARTS.length}</strong></button>
        )}
      </div>
      {mode === "strip" && (
        <div ref={stripSlot} style={{ minHeight: stuck ? slotHeight : undefined }}>
        <div className={`qd-strip ${stuck ? "is-stuck" : ""}`}>
          {PARTS.map((p) => {
            const v = valueOf(cw, p.key);
            return (
              <button key={p.key} className={`qd-chip ${v ? "is-filled" : ""} ${isCurrent(cw, p.key) ? "is-current" : ""} ${open === p.key ? "is-open" : ""}`} onClick={() => v && setOpen(open === p.key ? null : p.key)}>
                {v ? "✓ " : ""}{p.label}
              </button>
            );
          })}
          {open && valueOf(cw, open) && (
            <div className="qd-peek"><strong>{PARTS.find((p) => p.key === open)?.label}</strong> {valueOf(cw, open)} <button className="cw-link" onClick={() => setOpen(null)}>close</button></div>
          )}
        </div>
        </div>
      )}
      <RulesNote />
      <div className="qd-thread" ref={thread}>
        {cw.messages.map((m, i) => (
          <div key={i} className={`qd-msg is-${m.from}`}>
            <Bubble m={m} />
            {mode === "drawer" && m.part && <span className="qd-added">→ added to {m.part}</span>}
          </div>
        ))}
      </div>
      {mode === "strip" ? <div className="qd-fixed-reply"><Reply cw={cw} /></div> : <Reply cw={cw} />}
    </section>
  );

  return (
    <main className={`d2-main qd qd-m-${mode}`}>
      {chat}
      {mode === "rail" && (
        <aside className="qd-rail">
          <div className="qd-rail-head">Draft <span>{filled}/{PARTS.length}</span></div>
          <PartLines cw={cw} open={open} setOpen={setOpen} />
        </aside>
      )}
      {mode === "drawer" && drawer && (
        <>
          <div className="qd-scrim" onClick={() => setDrawer(false)} />
          <aside className="qd-drawer">
            <div className="qd-drawer-head"><strong>Draft</strong><span>{filled} of {PARTS.length} parts</span><button className="qd-x" onClick={() => setDrawer(false)} aria-label="Close">×</button></div>
            <p className="qd-drawer-note">Your answers so far, in the parts they'll fill. You can edit everything at the end.</p>
            {PARTS.map((p) => {
              const v = valueOf(cw, p.key);
              return (
                <div key={p.key} className={`qd-dpart ${v ? "is-filled" : ""} ${isCurrent(cw, p.key) ? "is-current" : ""}`}>
                  <span className="qd-dpart-k">{p.label}</span>
                  <span className="qd-dpart-v">{v || (isCurrent(cw, p.key) ? "Answering now…" : "Not yet")}</span>
                </div>
              );
            })}
          </aside>
        </>
      )}
    </main>
  );
}
