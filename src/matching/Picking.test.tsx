import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { openTab, setUpWithoutToken, unlockWith } from "../test/candidate";
import { createFakeModelGateway, type ReplyFor } from "../test/fakeModelGateway";
import { renderApp } from "../test/renderApp";

// The Engineering Manager Pack's Example Scenarios.
const TURN = "Turned around a team that kept missing its sprint goals";
const COACH = "Coached an underperforming engineer into leading a service";
const HIRE = "Hired five engineers in one quarter";
const PUSH = "Pushed back on a launch date the plan couldn't meet";
const USUAL = { [TURN]: 95, [COACH]: 70, [HIRE]: 55, [PUSH]: 50 }; // the top three: TURN, COACH, HIRE

/** The Scenarios a matching or reasons request sent, as the model sees them (promptVariants.ts `matchingMessage`). */
const sentScenarios = (user: string) => JSON.parse(user.split("Scenarios:\n")[1]) as { id: string; title: string }[];
const scores =
  (byTitle: Record<string, number>): ReplyFor =>
  ({ user }) => ({ scores: sentScenarios(user).map(({ id, title }) => ({ id, score: byTitle[title] ?? 0 })) });
const reasons: ReplyFor = ({ user }) => ({ reasons: sentScenarios(user).map(({ id, title }) => ({ id, reason: `Shows it in ${title}.` })) });

const user = () => userEvent.setup();

/** Sets up without a token, with matching faked (`rankings` in turn, then the usual), and opens the Engineering
 * Manager Pack's Interview. Returns the Unlock Key. */
async function inThePackInterview(rankings: Record<string, number>[] = []) {
  const matching = [...rankings, ...Array.from({ length: 12 }, () => USUAL)].map(scores);
  renderApp({ gateway: createFakeModelGateway({ generate: { matching, "match-reasons": Array.from({ length: matching.length }, () => reasons) } }) });
  const unlockKey = await setUpWithoutToken();
  await openTab("Backup");
  await user().click(await screen.findByRole("button", { name: /^Engineering Manager/ }));
  await user().click(await screen.findByRole("button", { name: "Add this Pack" }));
  await screen.findByRole("article", { name: "Question 1 of 6" });
  return unlockKey;
}

/** Deals the current Question's Matches (finding them the first time), unless they're already dealt. */
async function deal() {
  const button = screen.queryByRole("button", { name: /^(Find|Deal) my Matches$/ });
  if (button) await user().click(button);
  return within(await screen.findByRole("list", { name: "Matches" }));
}

const card = (title: string) => within(screen.getByRole("list", { name: "Matches" })).getByRole("button", { name: new RegExp(title.replace(/[.']/g, ".")) });
const progress = () => screen.getByText(/(Questions|picked)( ·|$)/, { selector: ".top-bar-progress" });
const next = () => user().click(screen.getByRole("button", { name: "Next Question" }));
const previous = () => user().click(screen.getByRole("button", { name: "Previous Question" }));

describe("picking a Match", () => {
  it("picks one Match per Question, changes it, and un-picks it", async () => {
    await inThePackInterview();
    await deal();
    expect(card(HIRE)).toHaveAttribute("aria-pressed", "false");
    expect(card(HIRE)).toHaveTextContent("Tap to pick");
    expect(progress()).toHaveTextContent(/^6 Questions$/);

    await user().click(card(HIRE));
    await waitFor(() => expect(card(HIRE)).toHaveAttribute("aria-pressed", "true"));
    expect(card(HIRE)).toHaveTextContent("✓ Picked");
    expect(progress()).toHaveTextContent(/^1\/6 picked$/);

    await user().click(card(COACH));
    await waitFor(() => expect(card(COACH)).toHaveAttribute("aria-pressed", "true"));
    expect(card(HIRE)).toHaveAttribute("aria-pressed", "false");
    expect(progress()).toHaveTextContent(/^1\/6 picked$/);

    await user().click(card(COACH));
    await waitFor(() => expect(card(COACH)).toHaveAttribute("aria-pressed", "false"));
    expect(progress()).toHaveTextContent(/^6 Questions$/);
  });

  it("keeps the pick in the Interview, after locking and unlocking", async () => {
    const unlockKey = await inThePackInterview();
    await deal();
    await user().click(card(HIRE));
    await waitFor(() => expect(card(HIRE)).toHaveAttribute("aria-pressed", "true"));
    await user().click(screen.getByRole("button", { name: "Lock" }));

    await unlockWith(unlockKey);
    await user().click(await screen.findByRole("button", { name: "Practise" }));
    await screen.findByRole("article", { name: "Question 1 of 6" });
    await deal();
    expect(card(HIRE)).toHaveAttribute("aria-pressed", "true");
  });

  it("labels a Scenario picked for another Question as already used, and it can still be picked", async () => {
    await inThePackInterview();
    await deal();
    await user().click(card(COACH));
    await waitFor(() => expect(card(COACH)).toHaveAttribute("aria-pressed", "true"));

    await next();
    await deal();
    expect(card(COACH)).toHaveTextContent("Already used for Q1");
    expect(card(TURN)).not.toHaveTextContent("Already used");
    await user().click(card(COACH));
    await waitFor(() => expect(card(COACH)).toHaveAttribute("aria-pressed", "true"));
    expect(progress()).toHaveTextContent(/^2\/6 picked$/);

    await previous();
    await deal();
    expect(card(COACH)).toHaveTextContent("Already used for Q2");
  });
});

describe("when the Matches change", () => {
  it("keeps the pick on re-matching if it's still a Match, and clears it with a note if it isn't", async () => {
    // Q1: the usual, then the same, then HIRE drops out of the top three.
    await inThePackInterview([USUAL, USUAL, { [TURN]: 95, [COACH]: 70, [PUSH]: 60, [HIRE]: 20 }]);
    await deal();
    await user().click(card(HIRE));
    await waitFor(() => expect(card(HIRE)).toHaveAttribute("aria-pressed", "true"));

    await user().click(screen.getByRole("button", { name: "More for this Question" }));
    await user().click(await screen.findByRole("menuitem", { name: "Re-run matching" }));
    await waitFor(() => expect(card(HIRE)).toHaveAttribute("aria-pressed", "true"));

    await user().click(screen.getByRole("button", { name: "More for this Question" }));
    await user().click(await screen.findByRole("menuitem", { name: "Re-run matching" }));
    expect(await screen.findByText(`Your pick, “${HIRE}”, isn't among the new Matches. Pick again.`)).toBeInTheDocument();
    expect(within(screen.getByRole("list", { name: "Matches" })).queryByRole("button", { name: /Hired five/ })).not.toBeInTheDocument();
    expect(progress()).toHaveTextContent(/^6 Questions$/);
  });

  it("clears the picks of a deleted Scenario, after warning that it's picked", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    await inThePackInterview();
    await deal();
    await user().click(card(HIRE));
    await waitFor(() => expect(card(HIRE)).toHaveAttribute("aria-pressed", "true"));

    await user().click(screen.getByRole("button", { name: "← Interviews" }));
    await openTab("Scenario Bank");
    await user().click(await screen.findByRole("button", { name: new RegExp(`^${HIRE}`) }));
    await user().click(screen.getByRole("button", { name: "Delete" }));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("It's the picked Scenario in 1 Interview; those Questions will need a new pick."));
    await waitFor(() => expect(screen.queryByRole("button", { name: new RegExp(`^${HIRE}`) })).not.toBeInTheDocument(), { timeout: 3000 });

    await openTab("Interviews");
    expect(within(await screen.findByRole("row", { name: /Engineering Manager/ })).getByText("0/6")).toBeInTheDocument();
  });

  it("clears the picks of Demo Scenarios when they're all removed", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    await inThePackInterview();
    await deal();
    await user().click(card(HIRE));
    await waitFor(() => expect(card(HIRE)).toHaveAttribute("aria-pressed", "true"));

    await user().click(screen.getByRole("button", { name: "← Interviews" }));
    await user().click(await screen.findByRole("button", { name: "Remove demo" }));
    await waitFor(() => expect(within(screen.getByRole("row", { name: /Engineering Manager/ })).getByText("0/6")).toBeInTheDocument(), { timeout: 3000 });
  });
});

describe("where picks show", () => {
  it("in the ☰ Questions menu, as a ✓", async () => {
    await inThePackInterview();
    await deal();
    await user().click(card(HIRE));
    await waitFor(() => expect(card(HIRE)).toHaveAttribute("aria-pressed", "true"));

    await user().click(screen.getByRole("button", { name: "☰ Questions" }));
    const items = await screen.findAllByRole("menuitem");
    expect(items[0]).toHaveTextContent("(picked)");
    expect(items[0]).toHaveTextContent("✓");
    expect(items[1]).not.toHaveTextContent("picked");
  });

  it("in the answer bar, naming the picked Scenario", async () => {
    await inThePackInterview();
    expect(screen.queryByText(/^Using/)).not.toBeInTheDocument();
    await deal();
    await user().click(card(HIRE));

    expect(await screen.findByText(HIRE, { selector: ".answer-using strong" })).toBeInTheDocument();
  });

  it("on the Interviews list, as a Picked column", async () => {
    await inThePackInterview();
    await deal();
    await user().click(card(HIRE));
    await waitFor(() => expect(card(HIRE)).toHaveAttribute("aria-pressed", "true"));
    await user().click(screen.getByRole("button", { name: "← Interviews" }));

    const table = within(await screen.findByRole("table", { name: "Interviews" }));
    expect(table.getByRole("columnheader", { name: "Picked" })).toBeInTheDocument();
    expect(within(table.getByRole("row", { name: /Engineering Manager/ })).getByText("1/6")).toBeInTheDocument();
  });

  it("in the Scenario Bank, on the list and in the reader", async () => {
    await inThePackInterview();
    await deal();
    await user().click(card(HIRE));
    await waitFor(() => expect(card(HIRE)).toHaveAttribute("aria-pressed", "true"));
    await user().click(screen.getByRole("button", { name: "← Interviews" }));
    await openTab("Scenario Bank");

    const item = await screen.findByRole("button", { name: new RegExp(`^${HIRE}`) });
    expect(item).toHaveTextContent("picked in 1");
    expect(screen.getByRole("button", { name: new RegExp(`^${TURN}`) })).not.toHaveTextContent("picked in");
    await user().click(item);
    expect(await screen.findByRole("article", { name: HIRE })).toHaveTextContent("Picked in: Engineering Manager (Q1)");
  });
});
