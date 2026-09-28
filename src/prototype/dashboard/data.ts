// PROTOTYPE — made-up, in-memory data for the dashboard. No LLM calls: "generating Questions" is a timer.
import { useState } from "react";

export type Interview = {
  id: string;
  role: string;
  company: string;
  questions: number;
  picked: number;
  gaps: number;
  answered: number;
  lastPractised: string | null; // human text, e.g. "2 days ago"
  gapSkills: string[];
};

export type BankSummary = { scenarios: number; demo: number; lastExport: string | null };

const SAMPLE: Interview[] = [
  { id: "i1", role: "Senior Product Engineer", company: "Northwind Logistics", questions: 8, picked: 2, gaps: 2, answered: 1, lastPractised: "2 days ago", gapSkills: ["legacy systems", "prioritisation"] },
  { id: "i2", role: "Engineering Manager", company: "Fabrikam Health", questions: 10, picked: 7, gaps: 1, answered: 5, lastPractised: "last week", gapSkills: ["hiring"] },
  { id: "i3", role: "Staff Engineer", company: "Contoso Energy", questions: 8, picked: 0, gaps: 0, answered: 0, lastPractised: null, gapSkills: [] },
];

// Pulls a role and company out of a pasted Job Spec — a stand-in for what the LLM would do.
export function guessTitle(spec: string) {
  const line = spec.split("\n").map((l) => l.trim()).find(Boolean) ?? "";
  const [role, company] = line.split(/\s+(?:at|—|-|–|\|)\s+/);
  return { role: role || "New role", company: company || "Company" };
}

export const SAMPLE_SPEC = `Senior Backend Engineer at Tailspin Toys
We're looking for an engineer to own our order pipeline end to end, mentor two junior engineers, and work with the warehouse team on a system migration planned for next year.`;

export function useDashboard() {
  const params = new URLSearchParams(location.search);
  const empty = params.get("scenario") === "empty";
  const [interviews, setInterviews] = useState<Interview[]>(empty ? [] : SAMPLE);
  const [bank, setBank] = useState<BankSummary>(empty ? { scenarios: 0, demo: 0, lastExport: null } : { scenarios: 6, demo: 1, lastExport: params.get("backup") === "recent" ? "today" : null });
  const [token, setToken] = useState<"active" | "expired" | "none">((params.get("token") as "expired" | "none") ?? "active");
  const [generating, setGenerating] = useState<string | null>(null); // id of an Interview whose Questions are being generated

  return {
    interviews,
    bank,
    token,
    generating,
    /** Adds an Interview. With `generate`, fakes ~8 Questions arriving after a moment; otherwise it starts empty. */
    create(spec: string, generate: boolean) {
      const { role, company } = guessTitle(spec);
      const id = `i${Date.now()}`;
      setInterviews((list) => [{ id, role, company, questions: 0, picked: 0, gaps: 0, answered: 0, lastPractised: null, gapSkills: [] }, ...list]);
      if (generate) {
        setGenerating(id);
        setTimeout(() => {
          setInterviews((list) => list.map((i) => (i.id === id ? { ...i, questions: 8 } : i)));
          setGenerating(null);
        }, 1800);
      }
      return id;
    },
    remove: (id: string) => setInterviews((list) => list.filter((i) => i.id !== id)),
    removeDemo: () => setBank((b) => ({ ...b, scenarios: b.scenarios - b.demo, demo: 0 })),
    exportNow: () => setBank((b) => ({ ...b, lastExport: "just now" })),
    setToken,
    reset(empty: boolean) {
      setInterviews(empty ? [] : SAMPLE);
      setBank(empty ? { scenarios: 0, demo: 0, lastExport: null } : { scenarios: 6, demo: 1, lastExport: null });
    },
  };
}

export type Dashboard = ReturnType<typeof useDashboard>;

export const interviewHref = () => "/?variant=K1";
export const totalGaps = (list: Interview[]) => list.reduce((n, i) => n + i.gaps, 0);

export const gapsText = (n: number) => `${n} ${n === 1 ? "Gap" : "Gaps"}`;
