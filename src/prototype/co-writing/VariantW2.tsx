// PROTOTYPE — Variant W2: chat with a live draft. Chat on the left, the Scenario draft on the right filling in part
// by part as you answer, so you can see exactly which words went where and what's still missing. When every part
// is answered, the right side becomes the editable review. On a phone, Chat and Draft are two tabs.
import { useEffect, useRef, useState } from "react";
import { PARTS, useCowrite, type Seed } from "./cowrite";
import { Bubble, DraftReview, Reply, RulesNote } from "./Shared";

export function VariantW2({ seed, onRestart }: { seed: Seed; onRestart: () => void }) {
  const cw = useCowrite(seed);
  const [tab, setTab] = useState<"chat" | "draft">("chat");
  const thread = useRef<HTMLDivElement>(null);
  // Keep the thread scrolled to the newest message, inside its own box (not the page).
  useEffect(() => { const el = thread.current; if (el) el.scrollTop = el.scrollHeight; }, [cw.messages.length]);
  useEffect(() => { if (cw.done) setTab("draft"); }, [cw.done]);
  const filled = PARTS.filter((p) => String(cw.draft[p.key] ?? "").trim()).length;

  return (
    <main className="d2-main w2">
      <div className="w2-tabs">
        <button className={tab === "chat" ? "is-on" : ""} onClick={() => setTab("chat")}>Chat</button>
        <button className={tab === "draft" ? "is-on" : ""} onClick={() => setTab("draft")}>Draft <span>{filled}/{PARTS.length}</span></button>
      </div>
      <section className={`w2-chat ${tab === "chat" ? "" : "is-hidden-phone"}`}>
        <h1>{seed.kind === "gap" ? "Write a story for this Gap" : "Co-write a story"}</h1>
        <RulesNote />
        <div className="w2-thread" ref={thread}>
          {cw.messages.map((m, i) => <Bubble key={i} m={m} />)}
        </div>
        <Reply cw={cw} />
      </section>
      <section className={`w2-draft ${tab === "draft" ? "" : "is-hidden-phone"}`}>
        {cw.done ? (
          <DraftReview cw={cw} seed={seed} onRestart={onRestart} />
        ) : (
          <div className="w2-live">
            <div className="w2-live-head"><strong>Draft</strong><span>{filled} of {PARTS.length} parts</span></div>
            {PARTS.map((p) => {
              const v = String(cw.draft[p.key] ?? "").trim();
              const current = cw.stage === p.key || (p.key === "title" && cw.stage === "about");
              return (
                <div key={p.key} className={`w2-part ${v ? "is-filled" : ""} ${current ? "is-current" : ""}`}>
                  <span className="w2-part-k">{p.label}</span>
                  <span className="w2-part-v">{v || (current ? "Answering now…" : "Not yet")}</span>
                </div>
              );
            })}
            {cw.draft.tags.length > 0 && <div className="w2-part is-filled"><span className="w2-part-k">Skills</span><span className="w2-part-v">{cw.draft.tags.join(", ")}</span></div>}
          </div>
        )}
      </section>
    </main>
  );
}
