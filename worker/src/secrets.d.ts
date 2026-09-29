// The Worker's secrets, typed by hand: `npm run types:worker` reads their names from worker/dev.vars.example, but
// Wrangler leaves out variables with empty values, and the example must stay empty so a forgotten secret is caught
// as `worker_not_configured` rather than sent as a placeholder.
interface Env {
  OPENROUTER_API_KEY: string;
  ACCESS_TOKEN_SECRET: string;
}
declare namespace Cloudflare {
  interface Env {
    OPENROUTER_API_KEY: string;
    ACCESS_TOKEN_SECRET: string;
  }
}
