import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { openTab, setUpWithoutToken, unlockWith } from "../test/candidate";
import { renderApp } from "../test/renderApp";

const user = () => userEvent.setup();
const ANSWER = "At my last company the checkout rewrite was three months behind, so I took over as tech lead.";

/** Sets up without an Access Token, adds the Engineering Manager Pack (6 Questions), and opens its Interview. Returns
 * the Unlock Key. */
async function inThePackInterview() {
  const unlockKey = await setUpWithoutToken();
  await openTab("Backup");
  await user().click(await screen.findByRole("button", { name: /^Engineering Manager/ }));
  await user().click(await screen.findByRole("button", { name: "Add this Pack" }));
  await screen.findByRole("article", { name: "Question 1 of 6" });
  return unlockKey;
}

const answerBox = () => screen.getByLabelText("Your answer");

/** Types an answer and waits until the bar says it's saved. */
async function answer(text: string) {
  await user().type(answerBox(), text);
  await waitFor(() => expect(screen.getByRole("status", { name: "Answer" })).toHaveTextContent("Saved"), { timeout: 3000 });
}

const progress = () => screen.getByText(/^6 Questions/);

describe("the answer bar", () => {
  it("saves a typed answer, without an Access Token, and shows it again on coming back to the Question", async () => {
    renderApp();
    await inThePackInterview();
    await answer(ANSWER);

    await user().click(screen.getByRole("button", { name: "Next Question" }));
    expect(await screen.findByRole("article", { name: "Question 2 of 6" })).toBeInTheDocument();
    expect(answerBox()).toHaveValue("");
    await user().click(screen.getByRole("button", { name: "Previous Question" }));
    await screen.findByRole("article", { name: "Question 1 of 6" });
    expect(answerBox()).toHaveValue(ANSWER);
  });

  it("keeps the answer after locking and unlocking", async () => {
    const { unmount } = renderApp();
    const unlockKey = await inThePackInterview();
    await answer(ANSWER);
    unmount();

    renderApp();
    await unlockWith(unlockKey);
    await user().click(await screen.findByRole("button", { name: "Practise" }));
    await screen.findByRole("article", { name: "Question 1 of 6" });
    expect(answerBox()).toHaveValue(ANSWER);
  });

  it("saves what was typed when the Candidate moves on before the pause", async () => {
    renderApp();
    await inThePackInterview();
    await user().type(answerBox(), "A quick answer");
    await user().click(screen.getByRole("button", { name: "Next Question" })); // at once, before the save after a pause
    await user().click(screen.getByRole("button", { name: "Previous Question" }));

    expect(await screen.findByDisplayValue("A quick answer")).toBeInTheDocument();
  });

  it("replaces the answer with a later one, and clearing the box clears it", async () => {
    renderApp();
    await inThePackInterview();
    await answer("First go.");
    expect(progress()).toHaveTextContent("1 answered");

    await user().clear(answerBox());
    await answer("Second go, better.");
    await user().click(screen.getByRole("button", { name: "Next Question" }));
    await user().click(screen.getByRole("button", { name: "Previous Question" }));
    expect(await screen.findByDisplayValue("Second go, better.")).toBeInTheDocument();

    await user().clear(answerBox());
    await waitFor(() => expect(progress()).not.toHaveTextContent("answered"), { timeout: 3000 });
  });

  it("counts answered Questions in the header", async () => {
    renderApp();
    await inThePackInterview();
    expect(progress()).toHaveTextContent(/^6 Questions$/);

    await answer("One.");
    await user().click(screen.getByRole("button", { name: "Next Question" }));
    await answer("Two.");
    expect(progress()).toHaveTextContent("6 Questions · 2 answered");
  });

  it("shows the word count and roughly how long it would take to say", async () => {
    renderApp();
    await inThePackInterview();
    await user().type(answerBox(), Array.from({ length: 65 }, () => "word").join(" "));

    expect(screen.getByText("65 words · ≈ 0:30 spoken")).toBeInTheDocument();
  });

  it("keeps an answer as plain text", async () => {
    renderApp();
    await inThePackInterview();
    await answer("<img src=x onerror=alert(1)>");

    expect(answerBox()).toHaveValue("<img src=x onerror=alert(1)>");
    expect(document.querySelector("img")).toBeNull();
  });

  it("says so when an answer can't be saved, and keeps the text", async () => {
    renderApp();
    await inThePackInterview();
    const put = vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(() => {
      throw new DOMException("The storage is full", "QuotaExceededError");
    });
    await user().type(answerBox(), ANSWER);

    await waitFor(() => expect(screen.getByRole("status", { name: "Answer" })).toHaveTextContent("Couldn't save your answer"), { timeout: 3000 });
    expect(answerBox()).toHaveValue(ANSWER);
    put.mockRestore();
  });

  it("keeps an answer typed just before the app is locked", async () => {
    renderApp();
    const unlockKey = await inThePackInterview();
    await user().type(answerBox(), "Typed just before locking");
    await user().click(screen.getByRole("button", { name: "Lock" })); // at once, before the save after a pause

    await unlockWith(unlockKey);
    await user().click(await screen.findByRole("button", { name: "Practise" }));
    await screen.findByRole("article", { name: "Question 1 of 6" });
    expect(answerBox()).toHaveValue("Typed just before locking");
  });
});

describe("Last practised", () => {
  /** Opens the app afresh, as on another day, and shows the Interviews list. */
  async function comeBack(unlockKey: string) {
    renderApp();
    await unlockWith(unlockKey);
    return within(await screen.findByRole("table", { name: "Interviews" }));
  }

  it("shows on the Interviews list when an Interview was last answered", async () => {
    vi.useFakeTimers({ toFake: ["Date"], shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-10-03T10:00:00"));
    const first = renderApp();
    const unlockKey = await inThePackInterview();
    await user().click(screen.getByRole("button", { name: "← Interviews" }));
    let table = within(await screen.findByRole("table", { name: "Interviews" }));
    expect(table.getByRole("columnheader", { name: "Last practised" })).toBeInTheDocument();
    expect(table.getByRole("row", { name: /Engineering Manager/ })).toHaveTextContent("—");

    await user().click(table.getByRole("button", { name: "Practise" }));
    await screen.findByRole("article", { name: "Question 1 of 6" });
    await answer(ANSWER);
    await user().click(screen.getByRole("button", { name: "← Interviews" }));
    expect(await screen.findByRole("row", { name: /Engineering Manager/ })).toHaveTextContent("Today");
    first.unmount();

    vi.setSystemTime(new Date("2026-10-04T09:00:00"));
    table = await comeBack(unlockKey);
    expect(table.getByRole("row", { name: /Engineering Manager/ })).toHaveTextContent("Yesterday");
    await user().click(screen.getByRole("button", { name: "Lock" }));

    vi.setSystemTime(new Date("2026-10-10T09:00:00"));
    await unlockWith(unlockKey);
    table = within(await screen.findByRole("table", { name: "Interviews" }));
    expect(table.getByRole("row", { name: /Engineering Manager/ })).toHaveTextContent("3 Oct");
  });
});
