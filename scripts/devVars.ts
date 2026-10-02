// The Worker's local secrets, worker/.dev.vars, made on the first `npm run local` (#63): the OpenRouter API key the
// reviewer gives, and an Access Token signing secret made up here. An existing file is never touched.
import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";

type Options = {
  path: string;
  /** Asks for the OpenRouter API key, without showing what's typed. */
  askForKey: () => Promise<string>;
  /** Tells the person running it what's happening. Never given the key. */
  say: (line: string) => void;
};

export async function ensureDevVars({ path, askForKey, say }: Options): Promise<"created" | "kept"> {
  if (existsSync(path)) return "kept";
  say("First run: the Worker needs your OpenRouter API key (from https://openrouter.ai/keys). It's saved in worker/.dev.vars, which git ignores, and only the Worker reads it.");
  const key = (await askForKey()).trim();
  if (!key) throw new Error("No OpenRouter API key given, so nothing was saved. Run npm run local again to enter it.");
  const secret = randomBytes(32).toString("hex"); // signs this machine's Access Tokens
  writeFileSync(
    path,
    [
      "# Made by npm run local. Gitignored: never commit it.",
      `OPENROUTER_API_KEY=${key}`,
      "# Signs the Access Tokens npm run local mints for this machine.",
      `ACCESS_TOKEN_SECRET=${secret}`,
      "",
    ].join("\n"),
    { mode: 0o600 },
  );
  say("Saved worker/.dev.vars.");
  return "created";
}
