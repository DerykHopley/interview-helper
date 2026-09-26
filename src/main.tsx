import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { InterviewViewPrototype } from "./prototype/interview-view/InterviewViewPrototype";

// No real app yet — the only route is the PROTOTYPE Interview view.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <InterviewViewPrototype />
  </StrictMode>,
);
