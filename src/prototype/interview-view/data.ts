// PROTOTYPE — made-up data, in memory only. No LLM calls.

export type Scenario = {
  id: string;
  title: string;
  role: string;
  tags: string[];
  result: string;
  origin: "hand" | "co-written" | "demo";
};

export type Match = { scenarioId: string; score: number; reason: string };

export type Question = {
  id: string;
  text: string;
  skill: string;
  matches: Match[]; // empty = Gap
  gapSuggestion?: string;
};

export const interview = {
  title: "Senior Product Engineer — Northwind Logistics",
  jobSpecExcerpt:
    "Own features end to end, work closely with operations teams, mentor junior engineers, keep a legacy dispatch system running while it is replaced.",
};

export const scenarios: Scenario[] = [
  {
    id: "s1",
    title: "Rescued the failing checkout migration",
    role: "Tech lead",
    tags: ["delivery under pressure", "technical leadership"],
    result: "Shipped 3 weeks late instead of 3 months; checkout errors down 40%",
    origin: "hand",
  },
  {
    id: "s2",
    title: "Disagreed with the CTO on build vs buy",
    role: "Senior engineer",
    tags: ["influencing", "conflict"],
    result: "Bought the tool; saved ~£120k in year one",
    origin: "co-written",
  },
  {
    id: "s3",
    title: "Mentored two juniors through their first on-call",
    role: "Senior engineer",
    tags: ["mentoring", "incident response"],
    result: "Both led incidents solo within 2 months",
    origin: "hand",
  },
  {
    id: "s4",
    title: "Shadowed warehouse staff to redesign picking screens",
    role: "Product engineer",
    tags: ["user empathy", "stakeholders"],
    result: "Pick time down 18%; support tickets halved",
    origin: "co-written",
  },
  {
    id: "s5",
    title: "Took down production with a bad config push",
    role: "Engineer",
    tags: ["failure", "learning", "incident response"],
    result: "Added config validation to CI; no repeat in 2 years",
    origin: "hand",
  },
  {
    id: "s6",
    title: "Demo: Launched a feature flag system",
    role: "Engineer",
    tags: ["delivery", "technical leadership"],
    result: "Release rollbacks went from hours to seconds",
    origin: "demo",
  },
];

export const questions: Question[] = [
  {
    id: "q1",
    text: "Tell me about a time you delivered a project under a tight deadline.",
    skill: "delivery under pressure",
    matches: [
      { scenarioId: "s1", score: 0.92, reason: "A late migration you recovered with a clear, measured outcome." },
      { scenarioId: "s6", score: 0.61, reason: "Shows delivery, but the deadline pressure is implied, not stated." },
    ],
  },
  {
    id: "q2",
    text: "Describe a time you disagreed with a senior stakeholder.",
    skill: "influencing",
    matches: [
      { scenarioId: "s2", score: 0.94, reason: "Direct disagreement with the CTO, resolved with evidence." },
      { scenarioId: "s1", score: 0.48, reason: "Involves pushing back on scope, but the conflict is secondary." },
    ],
  },
  {
    id: "q3",
    text: "How have you helped someone less experienced grow?",
    skill: "mentoring",
    matches: [
      { scenarioId: "s3", score: 0.9, reason: "Two juniors, a concrete goal, and a measurable result." },
    ],
  },
  {
    id: "q4",
    text: "Tell me about a time you worked closely with non-technical users.",
    skill: "operations partnership",
    matches: [
      { scenarioId: "s4", score: 0.95, reason: "You worked alongside warehouse staff, which is very close to this role." },
      { scenarioId: "s2", score: 0.4, reason: "Stakeholder work, but with technical leadership, not users." },
    ],
  },
  {
    id: "q5",
    text: "Tell me about a mistake you made and what you learned.",
    skill: "learning from failure",
    matches: [
      { scenarioId: "s5", score: 0.93, reason: "You own the mistake and show a lasting fix." },
      { scenarioId: "s1", score: 0.52, reason: "Recovering someone else's failure, less about your own mistake." },
    ],
  },
  {
    id: "q6",
    text: "How have you kept a legacy system running while replacing it?",
    skill: "legacy systems",
    matches: [],
    gapSuggestion: "A story where you kept an old system stable while its replacement was built — e.g. strangler pattern, dual running, or a freeze you negotiated.",
  },
  {
    id: "q7",
    text: "Describe a time you led a technical decision for your team.",
    skill: "technical leadership",
    matches: [
      { scenarioId: "s1", score: 0.81, reason: "You set the migration approach as tech lead." },
      { scenarioId: "s6", score: 0.74, reason: "You chose and rolled out the flag system." },
      { scenarioId: "s2", score: 0.58, reason: "A decision you influenced, but didn't own." },
    ],
  },
  {
    id: "q8",
    text: "Tell me about a time you had to prioritise competing requests from operations.",
    skill: "prioritisation",
    matches: [],
    gapSuggestion: "A story where two or more teams wanted different things from you and you had to choose, with the trade-off explained.",
  },
];

export const scenarioById = (id: string) => scenarios.find((s) => s.id === id)!;

export type Picks = Record<string, string | undefined>; // questionId -> scenarioId

export type VariantProps = {
  picks: Picks;
  pick: (questionId: string, scenarioId: string | undefined) => void;
};

// "already used for: …" — other Questions in this Interview that picked this Scenario
export function usedFor(picks: Picks, scenarioId: string, exceptQuestionId?: string) {
  return questions.filter((q) => q.id !== exceptQuestionId && picks[q.id] === scenarioId);
}

export const initialPicks: Picks = { q1: "s1", q3: "s3" };

// Short STAR outline per Scenario, for the rehearsal variant.
export const star: Record<string, { s: string; t: string; a: string; r: string }> = {
  s1: { s: "Checkout rewrite 3 months behind, team demoralised.", t: "Take over as tech lead and get it live.", a: "Cut scope to a strangler rollout, daily risk review, paired on the hardest parts.", r: "Shipped 3 weeks late instead of 3 months; errors down 40%." },
  s2: { s: "CTO wanted to build an in-house scheduling tool.", t: "Make the case for buying one instead.", a: "Costed both options, ran a 2-week trial, presented the numbers.", r: "Bought the tool; saved ~£120k in year one." },
  s3: { s: "Two juniors joining the on-call rota for the first time.", t: "Get them confident to lead incidents.", a: "Shadow shifts, game-day drills, wrote a runbook with them.", r: "Both led incidents solo within 2 months." },
  s4: { s: "Picking screens slow and error-prone per support tickets.", t: "Redesign them with the people using them.", a: "Spent 3 shifts in the warehouse, prototyped on a handheld, iterated weekly.", r: "Pick time down 18%; support tickets halved." },
  s5: { s: "Friday config push with a typo took down the API for 25 minutes.", t: "Restore service and stop it happening again.", a: "Rolled back, ran the post-mortem, added schema validation to CI.", r: "No repeat in 2 years." },
  s6: { s: "Releases rolled back by redeploying, taking hours.", t: "Make rollbacks instant.", a: "Introduced a feature flag service and migrated risky features to it.", r: "Rollbacks went from hours to seconds." },
};
