import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Three test boundaries, one per deployable part (spec #1, "Testing Decisions").
export default defineConfig({
  test: {
    projects: [
      {
        // App: the whole React app driven as a Candidate; only the Model Gateway is faked.
        plugins: [react()],
        // App tests drive whole flows (setup, several Scenarios, an Interview), so they get longer than the 5 s default.
        test: { name: "app", environment: "jsdom", include: ["src/**/*.test.{ts,tsx}"], setupFiles: ["src/test/setup.ts"], testTimeout: 15_000 },
      },
      // Worker: over HTTP in the Workers runtime; only OpenRouter's HTTP is faked.
      "worker/vitest.config.ts",
      {
        // Evaluation harness: scoring with fake Matchers, in Node.
        test: { name: "eval", environment: "node", include: ["eval/**/*.test.ts"] },
      },
    ],
  },
});
