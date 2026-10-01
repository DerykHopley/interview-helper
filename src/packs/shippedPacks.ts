// The Packs that ship with the app (#7), each a complete demo: an Interview with a Job Spec, Questions, and Example
// Scenarios written so most Questions get a clear Match, one Scenario fits two Questions, and one Question is a Gap.
// The Evaluation Set's fictional person (#16) replaces one later.
import engineeringManager from "./shipped/engineering-manager.pack.md?raw";
import softwareDeveloper from "./shipped/software-developer.pack.md?raw";
import { readPack, type Pack } from "./packFormat";

function shipped(file: string): Pack {
  const reading = readPack(file);
  if (!reading.ok) throw new Error(`A shipped Pack can't be read: ${reading.reason}`);
  return reading.pack;
}

export const SHIPPED_PACKS: Pack[] = [shipped(engineeringManager), shipped(softwareDeveloper)];
