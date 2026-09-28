import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { accessTokenStore } from "./access/accessTokenStore";
import { createWorkerGateway } from "./model-gateway/workerGateway";

// The Worker's URL. In dev it defaults to `npm run dev:worker` on port 8787; a production build must set
// VITE_WORKER_URL, rather than quietly calling the Candidate's own machine.
const workerUrl = import.meta.env.VITE_WORKER_URL ?? (import.meta.env.DEV ? "http://localhost:8787" : undefined);
if (!workerUrl) throw new Error("VITE_WORKER_URL isn't set for this build");

const gateway = createWorkerGateway({
  baseUrl: workerUrl,
  getAccessToken: () => accessTokenStore.get(),
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App gateway={gateway} />
  </StrictMode>,
);
