import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AccessPrototype } from "./prototype/access/AccessPrototype";
import { InterviewViewPrototype } from "./prototype/interview-view/InterviewViewPrototype";

// No real app yet — only PROTOTYPE routes: /prototype/access, and the Interview view everywhere else.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {location.pathname.startsWith("/prototype/access") ? <AccessPrototype /> : <InterviewViewPrototype />}
  </StrictMode>,
);
