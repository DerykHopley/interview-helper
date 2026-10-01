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
import { uniqueSkills } from "./skills";

type Origin = "hand-written" | "co-written" | "demo";

/** The body sections, in order: each Scenario field and its heading. */
export const SECTIONS = [
  ["situation", "Situation"],
  ["task", "Task"],
  ["action", "Action"],
  ["result", "Result"],
] as const;
type SectionField = (typeof SECTIONS)[number][0];

const text = z.string().trim().min(1);
// A hand-written file may say `date: 2023`, which YAML reads as a number.
const optionalText = z.preprocess((v) => (typeof v === "number" ? String(v) : v), text.optional());

export const scenarioSchema = z.object({
  title: text,
  role: text,
  skills: z.array(text).min(1).transform(uniqueSkills),
  measurableResults: z.array(text).default([]),
  date: optionalText,
  company: optionalText,
  origin: z.enum(["hand-written", "co-written", "demo"] satisfies Origin[]),
  situation: text,
  task: text,
  action: text,
  result: text,
});
export type Scenario = z.infer<typeof scenarioSchema>;
export type { Origin };

const HEADING = new RegExp(`^## (${SECTIONS.map(([, heading]) => heading).join("|")})$`);

export function toMarkdown(scenario: Scenario): string {
  const parsed = scenarioSchema.parse(scenario);
  const header = Object.fromEntries(Object.entries(parsed).filter(([key]) => !SECTIONS.some(([field]) => field === key)));
  const body = SECTIONS.map(([field, heading]) => `## ${heading}\n\n${escapeHeadings(parsed[field])}\n`);
  return `---\n${stringify(header)}---\n\n${body.join("\n")}`;
}

/** Throws when the text isn't a valid Scenario. Windows line endings are accepted. `fixed` overrides header fields,
 * e.g. a Pack's Example Scenario always becomes a Demo Scenario. */
export function parseScenario(markdown: string, fixed: Partial<Scenario> = {}): Scenario {
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(markdown.replace(/\r\n/g, "\n"));
  if (!match) throw new Error("A Scenario starts with a YAML header between --- lines");
  const lines: Partial<Record<SectionField, string[]>> = {};
  let current: SectionField | null = null;
  for (const line of match[2].split("\n")) {
    const heading = HEADING.exec(line);
    if (heading) current = SECTIONS.find(([, h]) => h === heading[1])![0];
    else if (current) (lines[current] ??= []).push(line);
  }
  const sections = Object.fromEntries(SECTIONS.map(([field]) => [field, unescapeHeadings((lines[field] ?? []).join("\n"))]));
  return scenarioSchema.parse({ ...(parse(match[1]) as object), ...fixed, ...sections });
}

const escapeHeadings = (section: string) => section.replace(/^(\\*)##/gm, "\\$1##");
const unescapeHeadings = (section: string) => section.replace(/^\\(\\*)##/gm, "$1##");
