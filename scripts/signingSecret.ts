// The Access Token signing secret for local scripts: the environment's, or the one in worker/.dev.vars.
import { fileURLToPath } from "node:url";
import { devVarsValue } from "./devVars";

/** worker/.dev.vars, the Worker's local secrets. */
export const DEV_VARS = fileURLToPath(new URL("../worker/.dev.vars", import.meta.url));

/** For `npm run token`: the environment's secret first (to mint for a deployed Worker), else the local one. */
export function readSigningSecret() {
  if (process.env.ACCESS_TOKEN_SECRET) return process.env.ACCESS_TOKEN_SECRET;
  const local = devVarsValue(DEV_VARS, "ACCESS_TOKEN_SECRET");
  if (local) return local;
  throw new Error("No signing secret: set ACCESS_TOKEN_SECRET, or add it to worker/.dev.vars");
}
