import type { ModelGateway, ModelJob } from "../model-gateway/ModelGateway";

type Script = Partial<Record<ModelJob, unknown[]>>;

/**
 * A Model Gateway with scripted replies, per job, in order. Replies still go through the request's schema,
 * so a scripted reply that doesn't match is rejected just like a real one. Unscripted calls fail loudly.
 */
export function createFakeModelGateway(script: Script = {}, embeddings: number[][] = []): ModelGateway {
  const queues = Object.fromEntries(Object.entries(script).map(([job, replies]) => [job, [...replies]])) as Script;
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
  };
}
