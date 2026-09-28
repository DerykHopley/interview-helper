import type { ModelGateway } from "./ModelGateway";

/** Placeholder until the Worker is connected (#3): every model call fails with a clear message. */
export const unavailableGateway: ModelGateway = {
  generate: () => Promise.reject(new Error("Model calls aren't connected yet.")),
  embed: () => Promise.reject(new Error("Model calls aren't connected yet.")),
};
