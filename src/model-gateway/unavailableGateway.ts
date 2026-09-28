import type { ModelGateway } from "./ModelGateway";

const notConnected = () => Promise.reject(new Error("Model calls aren't connected yet."));

/** Placeholder until the Worker is connected (#3): every model call fails with a clear message. */
export const unavailableGateway: ModelGateway = { generate: notConnected, embed: notConnected, decide: notConnected };
