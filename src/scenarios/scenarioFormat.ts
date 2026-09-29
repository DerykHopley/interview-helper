// The Scenario format (spec #1, "Scenario format"; CONTEXT.md): Markdown with a YAML header, e.g.
//
//   ---
//   title: Rescued the failing checkout migration
//   role: Tech lead
//   skills: [delivery under pressure, technical leadership]
//   measurableResults: [Checkout errors down 40%]
//   date: "2023"            (optional)
//   company: Tailwind       (optional)
//   origin: hand-written    (hand-written | co-written | demo)
//   ---
//
//   ## Situation
//   …
//   ## Task / ## Action / ## Result
//
// The same format is stored in the Vault and used in Packs and Scenario Exports. A body line that starts like a
// section heading ("## …") is written with a leading backslash, and read back without it, so any text round-trips.
import { parse, stringify } from "yaml";
import { z } from "zod";

export const ORIGINS = ["hand-written", "co-written", "demo"] as const;
export type Origin = (typeof ORIGINS)[number];

const SECTIONS = ["Situation", "Task", "Action", "Result"] as const;

const text = z.string().trim().min(1);
const header = z.object({
  title: text,
  role: text,
  skills: z.array(text).min(1),
  measurableResults: z.array(text).default([]),
  date: text.optional(),
  company: text.optional(),
  origin: z.enum(ORIGINS),
});

export const scenarioSchema = header.extend({ situation: text, task: text, action: text, result: text });
export type Scenario = z.infer<typeof scenarioSchema>;

export function toMarkdown(scenario: Scenario): string {
  const { situation, task, action, result, ...fields } = scenarioSchema.parse(scenario);
  const body = [situation, task, action, result].map((section, i) => `## ${SECTIONS[i]}\n\n${escapeHeadings(section)}\n`);
  return `---\n${stringify(fields)}---\n\n${body.join("\n")}`;
}

/** Throws when the text isn't a valid Scenario. */
export function parseScenario(markdown: string): Scenario {
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(markdown);
  if (!match) throw new Error("A Scenario starts with a YAML header between --- lines");
  const sections: Record<string, string> = {};
  let current: string | null = null;
  for (const line of match[2].split("\n")) {
    const heading = /^## (Situation|Task|Action|Result)$/.exec(line);
    if (heading) current = heading[1];
    else if (current) sections[current] = sections[current] === undefined ? line : `${sections[current]}\n${line}`;
  }
  const [situation, task, action, result] = SECTIONS.map((s) => unescapeHeadings(sections[s] ?? ""));
  return scenarioSchema.parse({ ...(parse(match[1]) as object), situation, task, action, result });
}

const escapeHeadings = (section: string) => section.replace(/^(\\*)##/gm, "\\$1##");
const unescapeHeadings = (section: string) => section.replace(/^\\(\\*)##/gm, "$1##");
