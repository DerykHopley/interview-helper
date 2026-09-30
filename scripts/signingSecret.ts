// The Access Token signing secret for local scripts: the environment's, or the one in worker/.dev.vars.
import { existsSync, readFileSync } from "node:fs";

export function readSigningSecret() {
  if (process.env.ACCESS_TOKEN_SECRET) return process.env.ACCESS_TOKEN_SECRET;
  const devVars = new URL("../worker/.dev.vars", import.meta.url);
  if (existsSync(devVars)) {
    const line = readFileSync(devVars, "utf8").split("\n").find((l) => l.startsWith("ACCESS_TOKEN_SECRET="));
    const value = line?.slice("ACCESS_TOKEN_SECRET=".length).trim().replace(/^"|"$/g, "");
    if (value) return value;
  }
  throw new Error("No signing secret: set ACCESS_TOKEN_SECRET, or add it to worker/.dev.vars");
}
