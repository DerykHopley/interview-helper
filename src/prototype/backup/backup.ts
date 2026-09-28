// PROTOTYPE — in-memory stand-in for Scenario Export / import and Pack import (spec stories 6–7, 22–23, 42–46, 51–54).
// Nothing is encrypted or read from disk: "choosing a file" picks one of the sample files below, so every outcome
// (good export, wrong key, valid Pack, broken Pack) can be tried without real files.
import { useState } from "react";

export type SampleFile =
  | { kind: "export"; name: string; stories: number; duplicates: number; sameKey: boolean; made: string }
  | { kind: "pack"; name: string; ok: true; title: string; author: string; instructions: number; questions: number; examples: number }
  | { kind: "pack"; name: string; ok: false; title: string; reason: string }
  | { kind: "unknown"; name: string };

export const SAMPLE_FILES: SampleFile[] = [
  { kind: "export", name: "interview-helper-2026-09-20.ihx", stories: 6, duplicates: 4, sameKey: true, made: "20 Sep 2026" },
  { kind: "export", name: "old-laptop-backup.ihx", stories: 5, duplicates: 0, sameKey: false, made: "2 Aug 2026" },
  { kind: "pack", name: "product-engineer-pack.zip", ok: true, title: "Product Engineer interviews", author: "Cohort 1 teachers", instructions: 1, questions: 24, examples: 3 },
  { kind: "pack", name: "broken-pack.zip", ok: false, title: "Leadership pack", reason: "questions.md line 14: a Question is missing its skill tag." },
  { kind: "unknown", name: "cv.pdf" },
];

export type Pack = { title: string; author: string; questions: number; examples: number; added: string };
export type HistoryItem = { when: string; what: string };

// The stored Unlock Key on this device (same as the access prototype's returning Candidate).
export const DEVICE_KEY = "7KQF-M2XD-9HRT-4VNC-P8WB-3JZE";
const norm = (s: string) => s.toUpperCase().replace(/[^0-9A-Z]/g, "");

export function useBackup() {
  const p = new URLSearchParams(location.search);
  const [lastExport, setLastExport] = useState<string | null>(p.get("backup") === "recent" ? "today, 09:12" : null);
  const [stories, setStories] = useState(6);
  const [persistent, setPersistent] = useState<"granted" | "denied" | "unknown">((p.get("storage") as "denied") ?? "granted");
  const [packs, setPacks] = useState<Pack[]>([{ title: "Starter behavioural Questions", author: "Interview Helper", questions: 12, examples: 2, added: "when you set up" }]);
  const [history, setHistory] = useState<HistoryItem[]>([{ when: "when you set up", what: "Added the Starter behavioural Questions Pack" }]);
  const log = (what: string) => setHistory((h) => [{ when: "just now", what }, ...h]);

  return {
    lastExport, stories, persistent, packs, history,
    exportNow() {
      setLastExport("just now");
      log(`Exported ${stories} stories`);
      const blob = new Blob(["PROTOTYPE — not a real export"], { type: "application/octet-stream" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `interview-helper-${new Date().toISOString().slice(0, 10)}.ihx`;
      a.click();
      URL.revokeObjectURL(a.href);
    },
    /** For an export made with a different key, the Candidate types that key. Returns false if it doesn't match. */
    checkKey(file: Extract<SampleFile, { kind: "export" }>, typed?: string) {
      if (file.sameKey) return true;
      return norm(typed ?? "") === norm("M3QD-8KTX-2VFR-6HWN-J9CB-4ZPE");
    },
    importExport(file: Extract<SampleFile, { kind: "export" }>) {
      const added = file.stories - file.duplicates;
      setStories((n) => n + added);
      log(`Imported ${added} stories from ${file.name}${file.duplicates ? ` (${file.duplicates} already here, skipped)` : ""}`);
      return added;
    },
    addPack(file: Extract<SampleFile, { kind: "pack"; ok: true }>) {
      setPacks((list) => [{ title: file.title, author: file.author, questions: file.questions, examples: file.examples, added: "just now" }, ...list]);
      log(`Added the ${file.title} Pack`);
    },
    removePack(title: string) {
      setPacks((list) => list.filter((x) => x.title !== title));
      log(`Removed the ${title} Pack`);
    },
    askPersistent: () => setPersistent("granted"),
    setPersistent,
  };
}

export type Backup = ReturnType<typeof useBackup>;
/** The key that opens old-laptop-backup.ihx, shown in the state panel so the "different key" path can be tried. */
export const OTHER_KEY = "M3QD-8KTX-2VFR-6HWN-J9CB-4ZPE";
