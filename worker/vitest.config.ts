import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineProject } from "vitest/config";

// Worker boundary: tests call the Worker over HTTP inside the Workers runtime (Miniflare).
export default defineProject({
  plugins: [cloudflareTest({ wrangler: { configPath: "./wrangler.jsonc" } })],
  test: { name: "worker", include: ["test/**/*.test.ts"] },
});
