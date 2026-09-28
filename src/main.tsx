import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AccessPrototype } from "./prototype/access/AccessPrototype";
import { DashboardPrototype } from "./prototype/dashboard/DashboardPrototype";
import { ScenarioBankPrototype } from "./prototype/scenario-bank/ScenarioBankPrototype";
import { BackupPrototype } from "./prototype/backup/BackupPrototype";
import { InterviewViewPrototype } from "./prototype/interview-view/InterviewViewPrototype";

// No real app yet — only PROTOTYPE routes: /prototype/access, /prototype/dashboard, /prototype/scenario-bank, /prototype/backup, and the Interview view everywhere else.
const path = location.pathname;
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {path.startsWith("/prototype/access") ? <AccessPrototype /> : path.startsWith("/prototype/dashboard") ? <DashboardPrototype /> : path.startsWith("/prototype/scenario-bank") ? <ScenarioBankPrototype /> : path.startsWith("/prototype/backup") ? <BackupPrototype /> : <InterviewViewPrototype />}
  </StrictMode>,
);
