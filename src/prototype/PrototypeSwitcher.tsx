// PROTOTYPE — floating variant switcher. Never shipped: hidden outside dev builds.
import { useEffect, useState, type ReactNode } from "react";

export type VariantDef = { key: string; name: string };

export function useVariant(variants: VariantDef[]) {
  const read = () => {
    const v = new URLSearchParams(location.search).get("variant");
    return variants.some((d) => d.key === v) ? v! : variants[0].key;
  };
  const [current, setCurrent] = useState(read);
  const set = (key: string) => {
    const url = new URL(location.href);
    url.searchParams.set("variant", key);
    history.replaceState(null, "", url);
    setCurrent(key);
  };
  return [current, set] as const;
}

export function PrototypeSwitcher({
  variants,
  current,
  onChange,
  state,
}: {
  variants: VariantDef[];
  current: string;
  onChange: (key: string) => void;
  state?: ReactNode;
}) {
  const [showState, setShowState] = useState(false);
  const i = variants.findIndex((v) => v.key === current);
  const step = (d: number) => onChange(variants[(i + d + variants.length) % variants.length].key);

  useEffect(() => {
    if (variants.length < 2) return; // leave the arrow keys to the page
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, [contenteditable]")) return;
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!import.meta.env.DEV) return null;

  const btn: React.CSSProperties = {
    background: "transparent", color: "inherit", border: 0, fontSize: 18, cursor: "pointer", padding: "4px 10px",
  };
  return (
    <div style={{ position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)", zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, fontFamily: "ui-monospace, monospace" }}>
      {showState && state && (
        <pre style={{ margin: 0, background: "#111", color: "#9fe", padding: 12, borderRadius: 8, fontSize: 12, maxHeight: 240, overflow: "auto", boxShadow: "0 6px 24px #0006" }}>
          {state}
        </pre>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 4, background: "#111", color: "#fff", borderRadius: 999, padding: "6px 10px", boxShadow: "0 6px 24px #0006", fontSize: 13, whiteSpace: "nowrap" }}>
        <span style={{ background: "#f0c", color: "#111", borderRadius: 999, padding: "1px 8px", fontWeight: 700, fontSize: 11 }}>PROTOTYPE</span>
        <button style={btn} onClick={() => step(-1)} aria-label="Previous variant">←</button>
        <span style={{ minWidth: 190, textAlign: "center" }}>{current} — {variants[i].name}</span>
        <button style={btn} onClick={() => step(1)} aria-label="Next variant">→</button>
        {state && <button style={{ ...btn, fontSize: 12, opacity: 0.7 }} onClick={() => setShowState((s) => !s)}>{showState ? "hide state" : "state"}</button>}
      </div>
    </div>
  );
}
