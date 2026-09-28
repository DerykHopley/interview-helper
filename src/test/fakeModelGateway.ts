import type { AccessStatus, DecisionAnswer, ModelGateway, ModelJob } from "../model-gateway/ModelGateway";

type Script = Partial<Record<ModelJob, unknown[]>>;
type DecisionScript = Partial<Record<ModelJob, Record<string, DecisionAnswer>[]>>;

/**
 * A Model Gateway with scripted replies, per job, in order. Generated replies still go through the request's
 * schema, so a scripted reply that doesn't match is rejected just like a real one. Unscripted calls fail loudly.
 */
export function createFakeModelGateway({
  generate = {},
  decide = {},
  embeddings = [],
  accessTokens = {},
}: {
  generate?: Script;
  decide?: DecisionScript;
  embeddings?: number[][];
  /** How the Worker would answer for each token; any other token is invalid. */
  accessTokens?: Record<string, AccessStatus>;
} = {}): ModelGateway {
  const queues = structuredClone(generate);
  const decisions = structuredClone(decide);
  return {
    generate(request) {
      const next = queues[request.job]?.shift();
      if (next === undefined) return Promise.reject(new Error(`No scripted reply for job "${request.job}"`));
      return Promise.resolve(request.schema.parse(next));
    },
    embed(texts) {
      if (embeddings.length < texts.length) return Promise.reject(new Error("Not enough scripted embeddings"));
      return Promise.resolve(embeddings.splice(0, texts.length));
    },
    checkAccess(token) {
      return Promise.resolve(accessTokens[token.trim()] ?? { ok: false, reason: "invalid" });
    },
    decide<Keys extends string>(request: { job: ModelJob; questions: Record<Keys, unknown> }) {
      const next = decisions[request.job]?.shift();
      if (!next) return Promise.reject(new Error(`No scripted decision for job "${request.job}"`));
      const missing = Object.keys(request.questions).filter((key) => !(key in next));
      if (missing.length) return Promise.reject(new Error(`Scripted decision has no answer for: ${missing.join(", ")}`));
      return Promise.resolve(next as Record<Keys, DecisionAnswer>);
    },
  };
}
