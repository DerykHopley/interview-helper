// The Worker's local secrets, worker/.dev.vars, set up by `npm run local` (#63): the OpenRouter API key the reviewer
// gives, and an Access Token signing secret made up here. A complete file is left as it is; one copied from the
// example and not filled in (or missing a value) gets only what's missing.
import { randomBytes } from "node:crypto";
import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";

const KEYS = ["OPENROUTER_API_KEY", "ACCESS_TOKEN_SECRET"] as const;
type Key = (typeof KEYS)[number];

type Options = {
  path: string;
  /** Asks for the OpenRouter API key, without showing what's typed. */
  askForKey: () => Promise<string>;
  /** Tells the person running it what's happening. Never given the key. */
  say: (line: string) => void;
};

/** A value from a .dev.vars file (quotes removed), or null if it's missing or empty. Only the file is read. */
export function devVarsValue(path: string, key: Key): string | null {
  if (!existsSync(path)) return null;
  const line = readFileSync(path, "utf8").split("\n").find((l) => l.startsWith(`${key}=`));
  const value = line?.slice(key.length + 1).trim().replace(/^"|"$/g, "");
  return value || null;
}

export async function ensureDevVars({ path, askForKey, say }: Options): Promise<"created" | "completed" | "kept"> {
  const existing = existsSync(path);
  const missing = KEYS.filter((key) => devVarsValue(path, key) === null);
  if (missing.length === 0) return "kept";

  const values: Partial<Record<Key, string>> = {};
  if (missing.includes("OPENROUTER_API_KEY")) {
    say("The Worker needs your OpenRouter API key (from https://openrouter.ai/keys). It's saved in worker/.dev.vars, which git ignores, and only the Worker reads it.");
    const key = (await askForKey()).trim();
    if (!key) throw new Error("No OpenRouter API key given, so nothing was saved. Run npm run local again to enter it.");
    values.OPENROUTER_API_KEY = key;
  }
  if (missing.includes("ACCESS_TOKEN_SECRET")) values.ACCESS_TOKEN_SECRET = randomBytes(32).toString("hex"); // signs this machine's tokens

  if (!existing) {
    const content = [
      "# Made by npm run local. Gitignored: never commit it.",
      `OPENROUTER_API_KEY=${values.OPENROUTER_API_KEY}`,
      "# Signs the Access Tokens npm run local mints for this machine.",
      `ACCESS_TOKEN_SECRET=${values.ACCESS_TOKEN_SECRET}`,
      "",
    ].join("\n");
    writeFileSync(path, content, { mode: 0o600, flag: "wx" }); // fails rather than overwrite a file made meanwhile
    say("Saved worker/.dev.vars.");
    return "created";
  }

  // Fill each missing value in on its own line (or add the line), keeping everything else in the file.
  let lines = readFileSync(path, "utf8").replace(/\n$/, "").split("\n");
  for (const key of missing) {
    const at = lines.findIndex((l) => l.startsWith(`${key}=`));
    if (at >= 0) lines[at] = `${key}=${values[key]}`;
    else lines = [...lines, `${key}=${values[key]}`];
  }
  writeFileSync(path, `${lines.join("\n")}\n`);
  chmodSync(path, 0o600);
  say(`Filled in ${missing.join(" and ")} in worker/.dev.vars.`);
  return "completed";
}
