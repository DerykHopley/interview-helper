import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineProject } from "vitest/config";

// Worker boundary: tests call the Worker over HTTP inside the Workers runtime (Miniflare).
export default defineProject({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      // Test-only secrets. OpenRouter's HTTP is faked, so the key is never used for real.
      miniflare: { bindings: { ACCESS_TOKEN_SECRET: "test-signing-secret", OPENROUTER_API_KEY: "test-openrouter-key" } },
    }),
  ],
  test: { name: "worker", include: ["test/**/*.test.ts"] },
});
