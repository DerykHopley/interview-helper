import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ModelGatewayError } from "../model-gateway/ModelGateway";
import { enterAccessToken, unlockWith } from "../test/candidate";
import { createFakeModelGateway, type ReplyFor } from "../test/fakeModelGateway";
import { renderApp } from "../test/renderApp";

const TOKEN = "group-token";
const ACTIVE = { [TOKEN]: { ok: true as const, label: "Cohort 7", expiresAt: new Date("2099-01-01T00:00:00.000Z") } };

/** The Scenarios a matching or reasons request sent (promptVariants.ts `matchingMessage`). */
const sentScenarios = (user: string) => JSON.parse(user.split("Scenarios:\n")[1]) as { id: string }[];
const scores: ReplyFor = ({ user }) => ({ notes: "", scores: sentScenarios(user).map(({ id }, i) => ({ id, score: 95 - i * 10 })) });
const reasons: ReplyFor = ({ user }) => ({ reasons: sentScenarios(user).map(({ id }) => ({ id, reason: "It fits." })) });

type Sent = Parameters<ReplyFor>[0] & { model?: string; maxTokens?: number; reasoningEffort?: string; temperature?: number };

const user = () => userEvent.setup();

/** Sets up with a token from the Engineering Manager Pack, with matching scripted, and records what each call asked for. */
async function inThePackInterview({ token = true, gateway }: { token?: boolean; gateway?: ReturnType<typeof createFakeModelGateway> } = {}) {
  const sent: Sent[] = [];
  const record = (reply: ReplyFor): ReplyFor => (request) => (sent.push(request), reply(request));
  const fake = gateway ?? createFakeModelGateway({ accessTokens: ACTIVE, generate: { matching: [record(scores), record(scores)], "match-reasons": [record(reasons), record(reasons)] } });
  const view = renderApp({ gateway: fake });
  if (token) await enterAccessToken(TOKEN);
  else await user().click(await screen.findByRole("button", { name: "I don't have one yet" }));
  const unlockKey = (await screen.findByLabelText("Your Unlock Key")).textContent ?? "";
  await user().click(screen.getByLabelText(/I've saved my Unlock Key/));
  await user().click(screen.getByRole("button", { name: "Continue" }));
  await user().click(screen.getByRole("button", { name: /^Start from the Engineering Manager Pack/ }));
  await screen.findByRole("article", { name: "Question 1 of 6" });
  if (token) await screen.findByRole("button", { name: /^Access ·/ });
  return { sent, unlockKey, ...view };
}

/** Opens the app again in the same browser, as after a reload, and unlocks it. */
async function reopen(unlockKey: string) {
  renderApp({ gateway: createFakeModelGateway({ accessTokens: ACTIVE }) });
  await unlockWith(unlockKey);
  await screen.findByRole("button", { name: "Lock" });
}

const devMode = async () => user().keyboard("{Control>}{Shift>}D{/Shift}{/Control}");
const panel = () => within(screen.getByRole("complementary", { name: "Developer" }));

/** Opens the panel's Settings on a job. */
async function settingsFor(job: string) {
  await user().click(screen.getByRole("button", { name: "Developer panel" }));
  await user().click(await panel().findByRole("button", { name: job })); // once the token is checked and the models load
}

async function findMatches() {
  await user().click(screen.getByRole("button", { name: "Find my Matches" }));
  await screen.findByRole("list", { name: "Matches" });
}

describe("turning the Developer panel on", () => {
  it("is hidden until Ctrl+Shift+D, and stays on in this browser until turned off", async () => {
    const { unmount, unlockKey } = await inThePackInterview();
    expect(screen.queryByRole("button", { name: "Developer panel" })).not.toBeInTheDocument();

    await devMode();
    expect(screen.getByRole("button", { name: "Developer panel" })).toBeInTheDocument();
    unmount();

    await reopen(unlockKey);
    expect(screen.getByRole("button", { name: "Developer panel" })).toBeInTheDocument();
    await user().click(screen.getByRole("button", { name: "Developer panel" }));
    await user().click(panel().getByRole("button", { name: "Turn off developer mode" }));
    expect(screen.queryByRole("button", { name: "Developer panel" })).not.toBeInTheDocument();
  });

  it("turns on with ?dev=1 in the address", async () => {
    window.history.replaceState(null, "", "/?dev=1");
    try {
      await inThePackInterview();
      expect(screen.getByRole("button", { name: "Developer panel" })).toBeInTheDocument();
    } finally {
      window.history.replaceState(null, "", "/");
    }
  });
});

describe("a job's settings", () => {
  it("override the Worker's defaults for that job's calls, in this browser", async () => {
    const { sent } = await inThePackInterview();
    await devMode();
    await settingsFor("Match reasons");

    expect(panel().getByLabelText("Model")).toHaveValue("openai/gpt-5-mini");
    expect(panel().getByRole("option", { name: "anthropic/claude-haiku-4.5 · $1 / $5 per million" })).toBeInTheDocument();
    expect(panel().getByText("one prompt")).toBeInTheDocument();
    await user().selectOptions(panel().getByLabelText("Model"), "anthropic/claude-haiku-4.5");
    await user().type(panel().getByLabelText("Temperature"), "0.3");
    await user().type(panel().getByLabelText("Max tokens"), "1500");
    await user().selectOptions(panel().getByLabelText("Reasoning effort"), "minimal");
    expect(panel().getByText("4 settings override the config defaults in this browser only.")).toBeInTheDocument();
    await user().click(panel().getByRole("button", { name: "Close the Developer panel" }));
    await findMatches();

    const reasonsCall = sent.find((r) => r.job === "match-reasons")!;
    expect(reasonsCall).toMatchObject({ model: "anthropic/claude-haiku-4.5", temperature: 0.3, maxTokens: 1500, reasoningEffort: "minimal" });
    const matchingCall = sent.find((r) => r.job === "matching")!;
    expect(matchingCall).toMatchObject({ model: "openai/gpt-5-mini", reasoningEffort: "low" }); // another job: untouched
    expect(matchingCall.temperature).toBeUndefined();
  });

  it("stop applying once developer mode is turned off", async () => {
    const { sent } = await inThePackInterview();
    await devMode();
    await settingsFor("Match reasons");
    await user().selectOptions(panel().getByLabelText("Model"), "openai/gpt-5-nano");
    await user().click(panel().getByRole("button", { name: "Turn off developer mode" }));
    await findMatches();

    expect(sent.find((r) => r.job === "match-reasons")!.model).toBeUndefined(); // the Worker's default
  });

  it("offer a temperature only for a model that takes one", async () => {
    await inThePackInterview();
    await devMode();
    await settingsFor("Feedback");

    expect(panel().getByLabelText("Temperature")).toBeDisabled();
    expect(panel().getByText("openai/gpt-5-mini doesn't take a temperature; reasoning effort is its setting.")).toBeInTheDocument();
    await user().selectOptions(panel().getByLabelText("Model"), "openai/gpt-4o-mini");
    expect(panel().getByLabelText("Temperature")).toBeEnabled();
    expect(panel().getByLabelText("Reasoning effort")).toBeDisabled(); // and gpt-4o-mini takes no reasoning effort
    await user().type(panel().getByLabelText("Temperature"), "0.8");
    await user().selectOptions(panel().getByLabelText("Model"), "openai/gpt-5-mini");

    expect(panel().getByLabelText("Temperature")).toHaveValue(null); // dropped with the model that took it
  });

  it("keep max tokens within the job's cap", async () => {
    await inThePackInterview();
    await devMode();
    await settingsFor("Feedback");
    await user().type(panel().getByLabelText("Max tokens"), "5000");

    expect(panel().getByText("At most 3000, this job's cap in the Worker.")).toBeInTheDocument();
    expect(panel().queryByText(/settings? overrides? the config defaults/)).not.toBeInTheDocument();
  });

  it("show what's changed, and reset a job or everything", async () => {
    const { unmount, unlockKey } = await inThePackInterview();
    await devMode();
    await settingsFor("Feedback");
    await user().selectOptions(panel().getByLabelText("Model"), "openai/gpt-5-nano");
    await user().click(panel().getByRole("button", { name: "Co-writing" }));
    await user().selectOptions(panel().getByLabelText("Model"), "openai/gpt-5-nano");
    unmount();

    await reopen(unlockKey);
    await settingsFor("Feedback");
    expect(panel().getByLabelText("Model").closest(".dev-field")).toHaveTextContent("Model · changed");
    expect(panel().getByText("2 settings override the config defaults in this browser only.")).toBeInTheDocument();
    await user().click(panel().getByRole("button", { name: "Reset Feedback to its defaults" }));
    expect(panel().getByLabelText("Model")).toHaveValue("openai/gpt-5-mini");
    expect(panel().getByText("1 setting overrides the config defaults in this browser only.")).toBeInTheDocument();
    await user().click(panel().getByRole("button", { name: "Reset all" }));
    expect(panel().queryByText(/the config defaults in this browser only/)).not.toBeInTheDocument();
  });
});

describe("matching's Setup", () => {
  it("offers only Setups the Matcher Report measured, and matches with the one picked", async () => {
    const { sent } = await inThePackInterview();
    await devMode();
    await settingsFor("Matching");

    const setup = panel().getByLabelText("Setup");
    expect(setup).toHaveValue("LLM (Rubric, zero-shot) · openai/gpt-5-mini · low effort");
    expect(within(setup).getByRole("option", { name: "Chain-of-thought · openai/gpt-5-mini · low effort — threshold 80" })).toBeInTheDocument();
    // A measured Setup on a model the Worker doesn't allow (here, Gemini isn't in the fake's list) isn't offered.
    expect(within(setup).queryByRole("option", { name: /gemini/ })).not.toBeInTheDocument();
    expect(panel().getByLabelText("Temperature")).toBeDisabled();
    expect(panel().getByText("Matching's Setups were measured without a temperature.")).toBeInTheDocument();
    await user().selectOptions(setup, "LLM (Chain-of-thought) · openai/gpt-5-mini · low effort");
    await user().click(panel().getByRole("button", { name: "Close the Developer panel" }));
    await findMatches();

    const matchingCall = sent.find((r) => r.job === "matching")!;
    expect(matchingCall.system).toMatch(/Before scoring, reason step by step in notes/);
    expect(matchingCall).toMatchObject({ model: "openai/gpt-5-mini", reasoningEffort: "low" });
  });

  it("marks Matches found with another Setup as out of date", async () => {
    await inThePackInterview();
    await findMatches();
    await devMode();
    await settingsFor("Matching");
    await user().selectOptions(panel().getByLabelText("Setup"), "LLM (Rubric, zero-shot) · openai/gpt-5-nano · low effort");
    await user().click(panel().getByRole("button", { name: "Close the Developer panel" }));

    expect(await screen.findByText(/^Matching has changed since these Matches were found\./)).toBeInTheDocument();
  });
});

describe("the Calls tab", () => {
  it("lists each call's job, model, tokens, time and billed cost, with the session's total, and never its text", async () => {
    await inThePackInterview();
    await devMode();
    await findMatches();
    await user().click(screen.getByRole("button", { name: "Developer panel" }));
    await user().click(panel().getByRole("tab", { name: "Calls 2" }));

    const calls = panel().getAllByRole("listitem").map((li) => li.textContent);
    expect(calls[0]).toMatch(/^Matching · openai\/gpt-5-mini\$0\.00100.*1,000 → 200 tokens · \d+(\.\d)? s · \d\d:\d\d:\d\d$/);
    expect(calls[1]).toMatch(/^Match reasons · openai\/gpt-5-mini\$0\.00100/);
    expect(panel().getByText("2 calls this session")).toBeInTheDocument();
    expect(panel().getByText("$0.00200", { selector: ".dev-total-cost" })).toBeInTheDocument();
    expect(panel().getByText(/Costs are what OpenRouter billed\. Tokens and cost only: no prompt or reply text is kept\./)).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Developer" })).not.toHaveTextContent("Tell me about a time");
  });
});

describe("what the Worker allows", () => {
  it("needs an Access Token, but the Calls tab still works", async () => {
    await inThePackInterview({ token: false });
    await devMode();
    await user().click(screen.getByRole("button", { name: "Developer panel" }));

    expect(panel().getByText("Enter an Access Token to load the Worker's models and limits.")).toBeInTheDocument();
    await user().click(panel().getByRole("tab", { name: "Calls 0" }));
    expect(panel().getByText("No calls yet this session.")).toBeInTheDocument();
  });

  it("says so when the Worker's models can't be read", async () => {
    const gateway = createFakeModelGateway({ accessTokens: ACTIVE, allowed: new ModelGatewayError("worker_unreachable") });
    await inThePackInterview({ gateway });
    await devMode();
    await user().click(screen.getByRole("button", { name: "Developer panel" }));

    expect(await panel().findByRole("alert")).toHaveTextContent("Couldn't load the Worker's models and limits.");
    await user().click(panel().getByRole("button", { name: "Try again" }));
  });

  it("says so when the Worker has no settings for a job, e.g. one started before the job was added", async () => {
    const { ALLOWED } = await import("../test/fakeModelGateway");
    const jobs = Object.fromEntries(Object.entries(ALLOWED.jobs).filter(([job]) => job !== "readiness-report"));
    await inThePackInterview({ gateway: createFakeModelGateway({ accessTokens: ACTIVE, allowed: { ...ALLOWED, jobs } }) });
    await devMode();
    await settingsFor("Readiness Report");

    expect(panel().getByText("The Worker has no settings for this job. Restart it, so it reads the current wrangler.jsonc.")).toBeInTheDocument();
    expect(panel().queryByLabelText("Model")).not.toBeInTheDocument();
  });

  it("shows when prices couldn't be read from OpenRouter", async () => {
    const gateway = createFakeModelGateway({
      accessTokens: ACTIVE,
      allowed: { models: [{ id: "openai/gpt-5-mini", price: null, temperature: false, reasoning: true }], jobs: (await import("../test/fakeModelGateway")).ALLOWED.jobs, pricesAt: null },
    });
    await inThePackInterview({ gateway });
    await devMode();
    await settingsFor("Feedback");

    await waitFor(() => expect(panel().getByRole("option", { name: "openai/gpt-5-mini · price unknown" })).toBeInTheDocument());
    expect(panel().getByText("OpenRouter's prices couldn't be read just now.")).toBeInTheDocument();
  });
});
