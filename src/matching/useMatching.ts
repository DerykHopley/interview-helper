import { useCallback, useMemo } from "react";
import { useModelGateway } from "../model-gateway/context";
import { scenarioBank } from "../scenarios/scenarioBank";
import type { Question } from "../interviews/interview";
import type { UnlockedVault } from "../vault/vault";
import { findMatches } from "./findMatches";
import { createLlmMatcher } from "./llmMatcher";
import { MATCHING_CONFIG } from "./matchingConfig";
import { PROMPT_VARIANTS } from "./promptVariants";

/** Finds a Question's Matches with the shipped Matcher (config), against the Candidate's current Scenarios. */
export function useMatching(vault: UnlockedVault) {
  const gateway = useModelGateway();
  const bank = useMemo(() => scenarioBank(vault), [vault]);
  const matcher = useMemo(() => createLlmMatcher(gateway, PROMPT_VARIANTS[MATCHING_CONFIG.promptVariant]), [gateway]);

  return useCallback(
    async (question: Question) => {
      const { scenarios } = await bank.list();
      if (scenarios.length === 0) return null; // nothing to match against
      return findMatches({ matcher, gateway, settings: MATCHING_CONFIG }, { text: question.text, skill: question.skill }, scenarios);
    },
    [bank, matcher, gateway],
  );
}
