import { vi } from "vitest";

type Handler = (request: Request) => Response | Promise<Response>;

/**
 * Fakes OpenRouter's HTTP. The Worker runs in the same isolate as the tests, so stubbing `fetch` catches every
 * outbound request. Requests to OpenRouter are recorded and answered by `handler`; anything else fails the test.
 */
export function fakeOpenRouter(handler: Handler = () => new Response("No OpenRouter reply scripted", { status: 500 })) {
  const requests: Request[] = [];
  const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const request = new Request(input, init);
    if (new URL(request.url).hostname !== "openrouter.ai") throw new Error(`Unexpected outbound request to ${request.url}`);
    requests.push(request.clone());
    return handler(request);
  });
  return { requests, restore: () => spy.mockRestore() };
}
