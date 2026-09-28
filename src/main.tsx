import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { unavailableGateway } from "./model-gateway/unavailableGateway";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App gateway={unavailableGateway} />
  </StrictMode>,
);
