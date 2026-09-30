// Why a model call failed, as the Candidate is told it: shared by every screen that calls a model.
import { ModelGatewayError } from "./ModelGateway";

export type CallProblem = "no-token" | "expired-token" | "unreachable" | "cut-off" | "failed";

/** How a failed model call reads to the Candidate. Anything that isn't a gateway error, such as a reply that fails
 * its schema, is "failed". */
export function callProblemOf(e: unknown): CallProblem {
  if (!(e instanceof ModelGatewayError)) return "failed";
  if (e.code === "expired_token") return "expired-token";
  if (e.code === "missing_token" || e.code === "invalid_token") return "no-token";
  if (e.code === "reply_cut_off") return "cut-off";
  return e.code === "worker_unreachable" ? "unreachable" : "failed";
}

/** The words for problems that read the same whatever the call was for. */
export const SHARED_PROBLEM_TEXT = {
  unreachable: "Couldn't reach the app's server. Check your connection and try again.",
  "cut-off": "The model ran out of room before it finished. Try again; if it keeps happening, tell the app owner.",
} as const satisfies Partial<Record<CallProblem, string>>;
