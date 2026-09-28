// PROTOTYPE — made-up Scenarios with every field from spec story 24, held in memory.
import { useState } from "react";

export type Origin = "hand" | "co-written" | "demo";

export type Scenario = {
  id: string;
  title: string;
  role: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  tags: string[];
  metrics: string; // real, measurable results
  date?: string; // optional, e.g. "2023"
  company?: string; // optional — may be left out for privacy
  origin: Origin;
  usedIn: string[]; // Interviews where this Scenario is the picked Match
  edited: string;
};

export const ORIGIN_LABEL: Record<Origin, string> = { hand: "Written by hand", "co-written": "Co-written with AI", demo: "Demo" };

const SAMPLE: Scenario[] = [
  { id: "s1", title: "Rescued the failing checkout migration", role: "Tech lead", situation: "The checkout rewrite was three months behind and the team was demoralised.", task: "Take over as tech lead and get it live without another big slip.", action: "Cut the scope to a strangler rollout, ran a 10-minute risk review every morning, and paired on the hardest parts.", result: "It shipped three weeks late instead of three months.", tags: ["delivery under pressure", "technical leadership"], metrics: "Checkout errors down 40%", date: "2023", company: "Tailwind Traders", origin: "hand", usedIn: ["Senior Product Engineer — Northwind"], edited: "3 days ago" },
  { id: "s2", title: "Disagreed with the CTO on build vs buy", role: "Senior engineer", situation: "The CTO wanted to build an in-house scheduling tool.", task: "Make the case for buying one instead.", action: "Costed both options, ran a two-week trial of the bought tool with one team, and presented the numbers.", result: "We bought the tool.", tags: ["influencing", "conflict"], metrics: "Saved about £120k in year one", date: "2022", origin: "co-written", usedIn: [], edited: "last week" },
  { id: "s3", title: "Mentored two juniors through their first on-call", role: "Senior engineer", situation: "Two junior engineers were joining the on-call rota for the first time.", task: "Get them confident enough to lead incidents.", action: "Shadow shifts, monthly game-day drills, and a runbook we wrote together.", result: "Both led incidents on their own within two months.", tags: ["mentoring", "incident response"], metrics: "2 of 2 leading incidents solo in 8 weeks", origin: "hand", usedIn: ["Senior Product Engineer — Northwind", "Engineering Manager — Fabrikam"], edited: "2 weeks ago" },
  { id: "s4", title: "Shadowed warehouse staff to redesign picking screens", role: "Product engineer", situation: "Support tickets showed the picking screens were slow and error-prone.", task: "Redesign them with the people who used them.", action: "Worked three shifts in the warehouse, prototyped on a handheld, and iterated weekly with the pickers.", result: "The new screens became the default in all three warehouses.", tags: ["user empathy", "stakeholders"], metrics: "Pick time down 18%; support tickets halved", date: "2021", company: "Northwind Logistics", origin: "co-written", usedIn: [], edited: "a month ago" },
  { id: "s5", title: "Took down production with a bad config push", role: "Engineer", situation: "A Friday config push with a typo took the API down.", task: "Restore service and stop it happening again.", action: "Rolled back, led the blameless post-mortem, and added schema validation for configs to CI.", result: "No repeat of that failure since.", tags: ["failure", "learning", "incident response"], metrics: "25-minute outage; zero repeats in 2 years", origin: "hand", usedIn: ["Senior Product Engineer — Northwind"], edited: "a month ago" },
  { id: "s6", title: "Launched a feature flag system", role: "Engineer", situation: "Releases were rolled back by redeploying, which took hours.", task: "Make rollbacks instant.", action: "Introduced a feature flag service and moved the riskiest features onto it first.", result: "Rollbacks became a toggle.", tags: ["delivery", "technical leadership"], metrics: "Rollbacks from hours to seconds", origin: "demo", usedIn: [], edited: "when added" },
];

export const REQUIRED: (keyof Scenario)[] = ["title", "role", "situation", "task", "action", "result", "metrics"];
export const FIELD_HINT: Partial<Record<keyof Scenario, string>> = {
  title: "A short name you'll recognise, e.g. \"Rescued the failing checkout migration\"",
  role: "Your role at the time",
  situation: "What was going on? Keep it to the context that matters.",
  task: "What were you responsible for?",
  action: "What did you do? Say \"I\", not \"we\".",
  result: "What changed because of what you did?",
  metrics: "Numbers you can back up, e.g. \"errors down 40%\"",
  tags: "Skills this story shows, comma separated",
  date: "Optional",
  company: "Optional — leave it out if it's sensitive",
};
export const MISSING_TEXT: Partial<Record<keyof Scenario, string>> = {
  title: "Give it a title", role: "Add your role", situation: "Add the Situation", task: "Add the Task", action: "Add the Action", result: "Add the Result", metrics: "Add a measurable result",
};

export const blank = (): Scenario => ({ id: `s${Date.now()}`, title: "", role: "", situation: "", task: "", action: "", result: "", tags: [], metrics: "", origin: "hand", usedIn: [], edited: "just now" });

export const missingFields = (s: Scenario) => REQUIRED.filter((k) => !String(s[k] ?? "").trim());

export function useBank() {
  const empty = new URLSearchParams(location.search).get("scenario") === "empty";
  const [scenarios, setScenarios] = useState<Scenario[]>(empty ? [] : SAMPLE);
  return {
    scenarios,
    save: (s: Scenario) => setScenarios((list) => (list.some((x) => x.id === s.id) ? list.map((x) => (x.id === s.id ? { ...s, edited: "just now" } : x)) : [{ ...s, edited: "just now" }, ...list])),
    remove: (id: string) => setScenarios((list) => list.filter((s) => s.id !== id)),
    removeDemo: () => setScenarios((list) => list.filter((s) => s.origin !== "demo")),
    reset: (toEmpty: boolean) => setScenarios(toEmpty ? [] : SAMPLE),
  };
}

export type Bank = ReturnType<typeof useBank>;

export const allTags = (list: Scenario[]) => {
  const counts = new Map<string, number>();
  list.forEach((s) => s.tags.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)));
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
};
