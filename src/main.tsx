import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { accessTokenStore } from "./access/accessTokenStore";
import { createWorkerGateway } from "./model-gateway/workerGateway";

// The Worker's URL: `npm run dev:worker` serves it on 8787 locally; set VITE_WORKER_URL for other environments.
const gateway = createWorkerGateway({
  baseUrl: import.meta.env.VITE_WORKER_URL ?? "http://localhost:8787",
  getAccessToken: () => accessTokenStore.get(),
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App gateway={gateway} />
  </StrictMode>,
);
