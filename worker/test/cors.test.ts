import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

const APP = "http://localhost:5173"; // ALLOWED_ORIGIN in wrangler.jsonc

describe("CORS for the web app", () => {
  it("answers the browser's preflight from the app's origin", async () => {
    const response = await exports.default.fetch("http://worker.test/v1/generate", {
      method: "OPTIONS",
      headers: { Origin: APP, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "authorization, content-type" },
    });

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(APP);
    expect(response.headers.get("Access-Control-Allow-Headers")).toBe("Authorization, Content-Type");
    expect(response.headers.get("Access-Control-Allow-Methods")).toBe("GET, POST");
  });

  it("lets the app read error replies too, so it can show why a token was refused", async () => {
    const response = await exports.default.fetch("http://worker.test/v1/access", { headers: { Origin: APP } });

    expect(response.status).toBe(401);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(APP);
  });

  it("gives no CORS headers to other origins", async () => {
    const response = await exports.default.fetch("http://worker.test/v1/access", { headers: { Origin: "https://evil.example" } });

    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
});
