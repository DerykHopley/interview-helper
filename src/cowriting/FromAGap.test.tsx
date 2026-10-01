import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ModelGatewayError } from "../model-gateway/ModelGateway";
import { deleteStoredRecord } from "../test/browserStorage";
import { enterAccessToken, openTab, setUpWithoutToken } from "../test/candidate";
import { createFakeModelGateway, type ReplyFor } from "../test/fakeModelGateway";
import { renderApp } from "../test/renderApp";

const TOKEN = "group-token";
const ACTIVE = { [TOKEN]: { ok: true as const, label: "Cohort 7", expiresAt: new Date("2099-01-01T00:00:00.000Z") } };
// The Engineering Manager Pack's sixth Question, which none of its Example Scenarios answers.
const GAP_QUESTION = "Walk me through how you led your team through a major production incident.";
const SUGGESTION = "A high-severity outage where they acted as incident commander and led the post-incident review.";
const NEW_TITLE = "Led the team through the warehouse outage";

const DRAFT = {
  title: NEW_TITLE,
  role: "Engineering manager",
  situation: "The warehouse system went down on a Monday morning.",
  task: "Get it back up and keep the warehouses informed.",
  action: "I ran the incident call and split the team into fixing and communicating.",
  result: "The system was back within two hours.",
  measurableResults: [],
  noMeasurableResult: true,
  skills: ["incident response"],
};
const ready = { message: "Your draft is ready to review.", draft: DRAFT, ready: true };

/** The Scenarios a matching or reasons request sent, as the model sees them (promptVariants.ts `matchingMessage`). */
const sentScenarios = (user: string) => JSON.parse(user.split("Scenarios:\n")[1]) as { id: string; title: string }[];
/** A "matching" reply scoring each Scenario by its title (0 for any other). */
const scores =
  (byTitle: Record<string, number>): ReplyFor =>
  ({ user }) => ({ scores: sentScenarios(user).map(({ id, title }) => ({ id, score: byTitle[title] ?? 0 })) });
/** A "match-reasons" reply giving each Scenario a reason by its title. */
const reasons =
  (byTitle: Record<string, string>): ReplyFor =>
  ({ user }) => ({ reasons: sentScenarios(user).map(({ id, title }) => ({ id, reason: byTitle[title] ?? "Shows something else." })) });

const user = () => userEvent.setup();

/** Sets up with a token, starting from the Engineering Manager Pack, and finds the Gap on its sixth Question. */
async function atTheGap(generate: Record<string, unknown[]>) {
  renderApp({ gateway: createFakeModelGateway({ accessTokens: ACTIVE, generate: { matching: [scores({})], "match-reasons": [{ suggestion: SUGGESTION }], ...generate } }) });
  await enterAccessToken(TOKEN);
  await user().click(await screen.findByLabelText(/I've saved my Unlock Key/));
  await user().click(screen.getByRole("button", { name: "Continue" }));
  await user().click(screen.getByRole("button", { name: /^Start from the Engineering Manager Pack/ }));
  await screen.findByRole("article", { name: "Question 1 of 6" });
  await screen.findByRole("button", { name: /^Access/ }); // the token has been checked
  for (let i = 0; i < 5; i++) await user().click(screen.getByRole("button", { name: "Next Question" }));
  expect(screen.getByRole("article", { name: "Question 6 of 6" })).toHaveTextContent(GAP_QUESTION);
  await user().click(screen.getByRole("button", { name: "Find my Matches" }));
  await screen.findByRole("region", { name: "No Scenario fits this Question yet" });
}

/** Answers once, and approves the draft the co-writer says is ready. */
async function answerAndApprove() {
  await user().type(screen.getByLabelText("Your answer"), "The warehouse outage");
  await user().click(screen.getByRole("button", { name: "Send" }));
  await screen.findByRole("heading", { name: "Review your draft" });
  await user().click(screen.getByRole("button", { name: "Approve and save" }));
}

describe("co-writing from a Gap", () => {
  it("starts from the Gap's Question and skill, telling the model those but never the Gap's suggestion", async () => {
    const systems: string[] = [];
    const record: ReplyFor = ({ system }) => (systems.push(system), { ...ready, ready: false, message: "What was your role?" });
    await atTheGap({ "co-writing": [record] });
    await user().click(screen.getByRole("button", { name: "Write a Scenario for this" }));

    expect(await screen.findByRole("heading", { name: "Co-write a Scenario" })).toBeInTheDocument();
    expect(screen.getByText(`For the Gap: “${GAP_QUESTION}” · incident response`)).toBeInTheDocument();
    expect(within(screen.getByRole("list", { name: "Conversation" })).getByRole("listitem")).toHaveTextContent(
      "Let's write the Scenario this Question needs. Think of a time that shows incident response. What's it about? A sentence is fine.",
    );

    await user().type(screen.getByLabelText("Your answer"), "The warehouse outage");
    await user().click(screen.getByRole("button", { name: "Send" }));
    await waitFor(() => expect(systems).toHaveLength(1));
    expect(systems[0]).toContain(`<gap_question>${JSON.stringify({ question: GAP_QUESTION, skill: "incident response" })}</gap_question>`);
    expect(systems[0]).not.toContain(SUGGESTION);
  });

  it("fills in the Gap's skill as a suggested skill", async () => {
    await atTheGap({ "co-writing": [{ ...ready, draft: { ...DRAFT, skills: [] } }] });
    await user().click(screen.getByRole("button", { name: "Write a Scenario for this" }));
    await user().type(await screen.findByLabelText("Your answer"), "The warehouse outage");
    await user().click(screen.getByRole("button", { name: "Send" }));

    await screen.findByRole("heading", { name: "Review your draft" });
    expect(screen.getByLabelText(/^Skills( \*)?$/)).toHaveValue("incident response");
  });

  it("re-matches that Question once the Scenario is saved, shows the Gap closed, and goes back to it with the new Match dealt", async () => {
    await atTheGap({
      "co-writing": [ready],
      matching: [scores({}), scores({ [NEW_TITLE]: 91 })],
      "match-reasons": [{ suggestion: SUGGESTION }, reasons({ [NEW_TITLE]: "You ran the incident call and had it back within two hours." })],
    });
    await user().click(screen.getByRole("button", { name: "Write a Scenario for this" }));
    await answerAndApprove();

    expect(await screen.findByText("✓ Saved to your Scenario Bank")).toBeInTheDocument();
    const outcome = await screen.findByRole("region", { name: "Gap closed" });
    expect(outcome).toHaveTextContent(`Your new Scenario is now the best Match for this Question: ${NEW_TITLE} · 91%`);
    expect(outcome).toHaveTextContent("You ran the incident call and had it back within two hours.");

    await user().click(within(outcome).getByRole("button", { name: "Back to the Question →" }));
    expect(await screen.findByRole("article", { name: "Question 6 of 6" })).toBeInTheDocument();
    const matches = await screen.findByRole("list", { name: "Matches" });
    expect(within(matches).getAllByRole("listitem")[0]).toHaveTextContent(NEW_TITLE);
  });

  it("says when the Question is still a Gap after re-matching", async () => {
    await atTheGap({
      "co-writing": [ready],
      matching: [scores({}), scores({ [NEW_TITLE]: 40 })],
      "match-reasons": [{ suggestion: SUGGESTION }, { suggestion: "Still a different Scenario." }],
    });
    await user().click(screen.getByRole("button", { name: "Write a Scenario for this" }));
    await answerAndApprove();

    const outcome = await screen.findByRole("region", { name: "Still a Gap" });
    expect(outcome).toHaveTextContent("Your new Scenario is saved, but it isn't a strong enough Match for this Question yet: the best score was 40%.");
    expect(within(outcome).getByRole("button", { name: "Back to the Question →" })).toBeInTheDocument();
  });

  it("says where the new Scenario ranks when another one is now the best Match", async () => {
    const BEST = "Turned around a team that kept missing its sprint goals"; // one of the Pack's own
    await atTheGap({
      "co-writing": [ready],
      matching: [scores({}), scores({ [BEST]: 88, [NEW_TITLE]: 80 })],
      "match-reasons": [{ suggestion: SUGGESTION }, reasons({ [BEST]: "You steadied a struggling team." })],
    });
    await user().click(screen.getByRole("button", { name: "Write a Scenario for this" }));
    await answerAndApprove();

    const outcome = await screen.findByRole("region", { name: "Gap closed" });
    expect(outcome).toHaveTextContent(`The best Match for this Question is now: ${BEST} · 88%`);
    expect(outcome).toHaveTextContent("Your new Scenario is #2.");
  });

  it("says so when the Interview was deleted meanwhile (e.g. in another tab), and keeps the saved Scenario", async () => {
    await atTheGap({ "co-writing": [ready] });
    await user().click(screen.getByRole("button", { name: "Write a Scenario for this" }));
    await deleteStoredRecord((id) => id.startsWith("interview:"));
    await answerAndApprove();

    const outcome = await screen.findByRole("region", { name: "Nothing to re-match" });
    expect(outcome).toHaveTextContent("Your Scenario is saved, but that Question is no longer in its Interview.");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await user().click(within(outcome).getByRole("button", { name: "See your Scenario" }));
    expect(await screen.findByRole("article", { name: NEW_TITLE })).toBeInTheDocument();
  });

  it("keeps the saved Scenario and offers Try again when re-matching fails", async () => {
    let calls = 0;
    const flaky: ReplyFor = (request) => (++calls === 2 ? Promise.reject(new ModelGatewayError("worker_unreachable")) : scores(calls === 1 ? {} : { [NEW_TITLE]: 91 })(request));
    await atTheGap({
      "co-writing": [ready],
      matching: [flaky, flaky, flaky],
      "match-reasons": [{ suggestion: SUGGESTION }, reasons({ [NEW_TITLE]: "You ran the incident call." })],
    });
    await user().click(screen.getByRole("button", { name: "Write a Scenario for this" }));
    await answerAndApprove();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Couldn't reach the app's server.");
    expect(screen.getByText("✓ Saved to your Scenario Bank")).toBeInTheDocument();
    await user().click(within(alert).getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("region", { name: "Gap closed" })).toBeInTheDocument();
  });

  it("doesn't ask before leaving once the Scenario is saved", async () => {
    await atTheGap({ "co-writing": [ready], matching: [scores({}), scores({ [NEW_TITLE]: 91 })], "match-reasons": [{ suggestion: SUGGESTION }, reasons({})] });
    await user().click(screen.getByRole("button", { name: "Write a Scenario for this" }));
    await answerAndApprove();
    await screen.findByRole("region", { name: "Gap closed" });

    await openTab("Interviews"); // window.confirm would throw in jsdom if it were asked
    expect(await screen.findByRole("table", { name: "Interviews" })).toBeInTheDocument();
  });
});

describe("a not-covered skill chip", () => {
  it("starts co-writing seeded with just its skill, with no re-match after saving", async () => {
    await atTheGap({ "co-writing": [{ ...ready, draft: { ...DRAFT, skills: [] } }] });
    await user().click(screen.getByRole("button", { name: "← Interviews" }));
    await openTab("Scenario Bank");
    await user().click(await screen.findByRole("button", { name: "Write a Scenario for incident response" }));

    expect(await screen.findByRole("heading", { name: "Co-write a Scenario" })).toBeInTheDocument();
    expect(screen.queryByText(/^For the Gap:/)).not.toBeInTheDocument();
    await answerAndApprove();
    expect(await screen.findByRole("article", { name: NEW_TITLE })).toHaveTextContent("incident response");
    expect(screen.queryByText(/Re-matching/)).not.toBeInTheDocument();
  });

  it("and the Gap card, open the hand-written form with the skill without an Access Token", async () => {
    renderApp({ gateway: createFakeModelGateway({ generate: { matching: [scores({})], "match-reasons": [{ suggestion: SUGGESTION }] } }) });
    await setUpWithoutToken();
    await openTab("Backup");
    await user().click(await screen.findByRole("button", { name: /^Engineering Manager/ }));
    await user().click(await screen.findByRole("button", { name: "Add this Pack" }));
    await screen.findByRole("article", { name: "Question 1 of 6" });
    for (let i = 0; i < 5; i++) await user().click(screen.getByRole("button", { name: "Next Question" }));
    await user().click(screen.getByRole("button", { name: "Find my Matches" }));
    await user().click(await screen.findByRole("button", { name: "Write a Scenario for this" }));

    expect(await screen.findByRole("button", { name: "Save Scenario" })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Skills( \*)?$/)).toHaveValue("incident response");
  });
});
