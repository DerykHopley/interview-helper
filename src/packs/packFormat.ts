// The Pack format (GLOSSARY.md "Pack"; decisions on #7): one plain-text Markdown file a teacher can write in any
// editor. A YAML header holds the Pack's name, its Interview and its Questions; each Example Scenario then follows
// under its own "# Example Scenario" line, in the Scenario format without an origin, e.g.
//
//   ---
//   pack: Engineering Manager
//   interview:                 (optional, and so is each field)
//     role: Engineering Manager      (defaults to the Pack's name)
//     company: Northwind (fictional)
//     jobSpec: |
//       We're hiring an EM to …
//   questions:
//     - text: Tell me about a time you turned around an underperforming team.
//       skill: people leadership
//   ---
//
//   # Example Scenario
//
//   ---
//   title: Rebuilt trust in a missed-deadline team
//   …
//   ---
//
//   ## Situation
//   …
//
// A Pack comes from someone else, so all of it is untrusted: it's checked here, and only ever shown as plain text.
import { parse } from "yaml";
import { z } from "zod";
import { parseScenario, SECTIONS, splitHeader, type Scenario } from "../scenarios/scenarioFormat";

export type Pack = {
  name: string;
  /** The Interview it creates: named after the Pack unless it gives a role. */
  role: string;
  company?: string;
  jobSpec?: string;
  questions: { text: string; skill: string }[];
  /** Each a Demo Scenario, ready to copy in. */
  exampleScenarios: Scenario[];
};

export type PackReading = { ok: true; pack: Pack } | { ok: false; reason: string };

/** Packs are small: a few Questions and Scenarios. Anything bigger isn't one, and isn't read further. */
const MAX_BYTES = 200_000;
const NOT_READABLE = "That isn't a file this app can read.";
const MARKER = /^# Example Scenario[ \t]*$/m;

const text = z.string().trim().min(1);
const headerSchema = z.object({
  pack: text,
  interview: z.object({ role: text.optional(), company: text.optional(), jobSpec: text.optional() }).default({}),
  questions: z.array(z.object({ text, skill: text })).min(1),
});

/** Reads a Pack file, or says why it can't be used. */
export function readPack(file: string): PackReading {
  if (new TextEncoder().encode(file).length > MAX_BYTES) return rejected(`it's larger than ${MAX_BYTES / 1000} KB`);
  const split = splitHeader(file);
  if (!split) return { ok: false, reason: NOT_READABLE };

  let raw: unknown;
  try {
    raw = parse(split.header);
  } catch {
    return rejected("its header isn't valid YAML");
  }
  const header = headerSchema.safeParse(raw);
  if (!header.success) return rejected(headerProblem(header.error.issues[0]));

  const [before, ...blocks] = split.body.split(MARKER);
  if (before.trim()) return rejected("only Example Scenarios, each under a “# Example Scenario” line, can follow the header");
  if (blocks.length === 0) return rejected("it has no Example Scenarios");
  const exampleScenarios: Scenario[] = [];
  for (const [i, block] of blocks.entries()) {
    const read = readExample(block.trim() + "\n");
    if (typeof read === "string") return rejected(`Example Scenario ${i + 1} ${read}`);
    exampleScenarios.push(read);
  }

  const { pack: name, interview, questions } = header.data;
  return { ok: true, pack: { name, role: interview.role ?? name, company: interview.company, jobSpec: interview.jobSpec, questions, exampleScenarios } };
}

const rejected = (reason: string): PackReading => ({ ok: false, reason: `This Pack can't be used: ${reason}.` });

function headerProblem(issue: z.core.$ZodIssue): string {
  const [first, index, field] = issue.path;
  if (first === "pack") return "it has no name (pack:)";
  if (first === "questions" && index === undefined) return "it has no Questions";
  if (first === "questions" && typeof index === "number") return `Question ${index + 1} has no ${String(field ?? "text")}`;
  return `its header's ${issue.path.join(".")} isn't valid`;
}

/** One Example Scenario, as a Demo Scenario, or what's wrong with it ("has no Result section"). */
function readExample(block: string): Scenario | string {
  const split = splitHeader(block);
  if (!split) return "doesn't start with a YAML header between --- lines";
  let header: unknown;
  try {
    header = parse(split.header);
  } catch {
    return "has a header that isn't valid YAML";
  }
  // Where a Scenario came from is the app's to say: a Pack's are always Demo Scenarios (#7).
  if (header && typeof header === "object" && "origin" in header) return "gives an origin. Leave it out: every Example Scenario becomes a Demo Scenario";
  try {
    return parseScenario(block, { origin: "demo" });
  } catch (e) {
    if (!(e instanceof z.ZodError)) throw e;
    const issue = e.issues[0];
    const key = String(issue.path[0]);
    const heading = SECTIONS.find(([field]) => field === key)?.[1];
    const missing = issue.code === "too_small" || (issue.code === "invalid_type" && issue.input === undefined);
    return heading ? `has no ${heading} section` : `${missing ? "has no" : "has an invalid"} ${key} in its header`;
  }
}
