import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { corruptStoredRecord, everythingStored } from "../test/browserStorage";
import { setUpWithoutToken, unlockWith } from "../test/candidate";
import { renderApp } from "../test/renderApp";

const NORTHWIND = {
  Role: "Senior Product Engineer",
  Company: "Northwind Logistics",
  "Job Spec": "We're hiring a Senior Product Engineer to lead our warehouse tools team.",
};

/** Fills in the New Interview drawer and creates it. */
async function createInterview(fields: Record<string, string>) {
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "+ New Interview" }));
  const drawer = screen.getByRole("dialog", { name: "New Interview" });
  for (const [label, value] of Object.entries(fields)) {
    if (value) await user.type(within(drawer).getByLabelText(new RegExp(`^${label}( \\*)?$`)), value);
  }
  await user.click(within(drawer).getByRole("button", { name: "Create Interview" }));
}

const DISAGREED = "Tell me about a time you disagreed with your manager.";

/** Waits until a Question's card is showing (its text alone could still be in the "Your Question" box). */
const questionCard = (text: string) => waitFor(() => expect(screen.getByRole("article")).toHaveTextContent(text));

/** Types a Question on the end-of-deck card. */
async function addQuestion(text: string, skill = "") {
  const user = userEvent.setup();
  const end = await screen.findByRole("region", { name: /^(No Questions yet|That's all \d+ Questions?)$/ });
  await user.type(within(end).getByLabelText("Your Question"), text);
  if (skill) await user.type(within(end).getByLabelText("Skill it tests (optional)"), skill);
  await user.click(within(end).getByRole("button", { name: "Add Question" }));
}

describe("creating an Interview", () => {
  it("lands on Interviews, creates one from a pasted Job Spec, and lists it with its role and company", async () => {
    const user = userEvent.setup();
    renderApp();
    await setUpWithoutToken();
    expect(screen.getByRole("tab", { name: "Interviews", selected: true })).toBeInTheDocument();

    await createInterview(NORTHWIND);

    const heading = await screen.findByRole("heading", { level: 1, name: /Senior Product Engineer/ });
    expect(heading).toHaveTextContent("Northwind Logistics");
    await user.click(screen.getByRole("button", { name: "← Interviews" }));

    const row = within(await screen.findByRole("table", { name: "Interviews" })).getByRole("row", { name: /Senior Product Engineer/ });
    expect(row).toHaveTextContent("Northwind Logistics");
    expect(within(row).getByRole("cell", { name: "0" })).toBeInTheDocument();
  });

  it("needs a role and a Job Spec, but not a company", async () => {
    const user = userEvent.setup();
    renderApp();
    await setUpWithoutToken();

    await createInterview({ Company: "Northwind Logistics" });

    const drawer = screen.getByRole("dialog", { name: "New Interview" });
    expect(within(drawer).getByRole("alert")).toHaveTextContent("Still missing: the role, the Job Spec.");
    expect(within(drawer).getByLabelText("Role *")).toHaveAccessibleDescription("Add the role you're applying for");

    await user.type(within(drawer).getByLabelText("Role *"), "Staff Engineer");
    await user.type(within(drawer).getByLabelText("Job Spec *"), "A Staff Engineer for our platform team.");
    await user.clear(within(drawer).getByLabelText("Company"));
    await user.click(within(drawer).getByRole("button", { name: "Create Interview" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Staff Engineer" })).toBeInTheDocument();
  });

  it("creates nothing on Cancel", async () => {
    const user = userEvent.setup();
    renderApp();
    await setUpWithoutToken();
    await user.click(await screen.findByRole("button", { name: "+ New Interview" }));
    await user.type(screen.getByLabelText("Role *"), "Staff Engineer");

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(within(screen.getByRole("table", { name: "Interviews" })).queryAllByRole("row")).toHaveLength(1); // the header row
  });
});

describe("typing Questions", () => {
  it("adds a typed Question, with its skill, and keeps it after a reload", async () => {
    const user = userEvent.setup();
    const { unmount } = renderApp();
    const unlockKey = await setUpWithoutToken();
    await createInterview(NORTHWIND);
    expect(await screen.findByRole("region", { name: "No Questions yet" })).toBeInTheDocument();

    await addQuestion(DISAGREED, "conflict");

    const card = await screen.findByRole("article", { name: "Question 1 of 1" });
    expect(card).toHaveTextContent(DISAGREED);
    expect(card).toHaveTextContent("conflict");
    expect(card).toHaveTextContent("typed by you");
    expect(screen.getByText("1 Question")).toBeInTheDocument();
    unmount();

    renderApp();
    await unlockWith(unlockKey);
    const row = within(await screen.findByRole("table", { name: "Interviews" })).getByRole("row", { name: /Senior Product Engineer/ });
    expect(within(row).getByRole("cell", { name: "1" })).toBeInTheDocument();
    await user.click(within(row).getByRole("button", { name: "Practise" }));
    expect(await screen.findByRole("article", { name: "Question 1 of 1" })).toHaveTextContent(DISAGREED);
  });

  it("doesn't need a skill, and won't add an empty Question", async () => {
    renderApp();
    await setUpWithoutToken();
    await createInterview(NORTHWIND);

    const end = await screen.findByRole("region", { name: "No Questions yet" });
    expect(within(end).getByRole("button", { name: "Add Question" })).toBeDisabled();
    await addQuestion("Why do you want this job?");

    const card = await screen.findByRole("article", { name: "Question 1 of 1" });
    expect(card).toHaveTextContent("Why do you want this job?");
    expect(card).toHaveTextContent("typed by you");
  });
});

describe("moving through the deck", () => {
  const QUESTIONS = [DISAGREED, "Describe a project you're proud of.", "Tell me about a mistake you made."];
  const showing = () => screen.getByRole("article").getAttribute("aria-label");

  async function interviewWithThreeQuestions() {
    renderApp();
    await setUpWithoutToken();
    await createInterview(NORTHWIND);
    for (const q of QUESTIONS) {
      await addQuestion(q);
      await questionCard(q);
      await userEvent.setup().click(screen.getByRole("button", { name: "Next Question" }));
    }
    await screen.findByRole("region", { name: "That's all 3 Questions" });
  }

  it("goes back and forth with the side arrows and the arrow keys, but not while typing", async () => {
    const user = userEvent.setup();
    await interviewWithThreeQuestions();

    await user.click(screen.getByRole("button", { name: "Previous Question" }));
    expect(showing()).toBe("Question 3 of 3");
    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(showing()).toBe("Question 1 of 3");
    expect(screen.getByRole("button", { name: "Previous Question" })).toBeDisabled();
    await user.keyboard("{ArrowRight}");
    expect(showing()).toBe("Question 2 of 3");

    await user.keyboard("{ArrowRight}{ArrowRight}");
    await user.click(screen.getByLabelText("Your Question"));
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("region", { name: "That's all 3 Questions" })).toBeInTheDocument();
  });

  it("swipes to the next and previous Question", async () => {
    const user = userEvent.setup();
    await interviewWithThreeQuestions();
    await user.click(screen.getByRole("button", { name: "Previous Question" }));
    const deck = screen.getByRole("group", { name: "Question deck" });

    await user.pointer([{ keys: "[TouchA>]", target: deck, coords: { clientX: 100 } }, { pointerName: "TouchA", coords: { clientX: 300 } }, { keys: "[/TouchA]" }]);
    expect(showing()).toBe("Question 2 of 3");
    await user.pointer([{ keys: "[TouchA>]", target: deck, coords: { clientX: 300 } }, { pointerName: "TouchA", coords: { clientX: 100 } }, { keys: "[/TouchA]" }]);
    expect(showing()).toBe("Question 3 of 3");
  });

  it("jumps straight to a Question from the header's Questions menu", async () => {
    const user = userEvent.setup();
    await interviewWithThreeQuestions();

    await user.click(screen.getByRole("button", { name: "☰ Questions" }));
    const menu = screen.getByRole("menu", { name: "Questions" });
    expect(within(menu).getAllByRole("menuitem").map((item) => item.textContent)).toEqual([
      expect.stringContaining(QUESTIONS[0]),
      expect.stringContaining(QUESTIONS[1]),
      expect.stringContaining(QUESTIONS[2]),
    ]);
    await user.click(within(menu).getByRole("menuitem", { name: /Describe a project/ }));

    expect(showing()).toBe("Question 2 of 3");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "☰ Questions" }));
    expect(within(screen.getByRole("menu")).getByRole("menuitem", { name: /Describe a project/ })).toHaveAttribute("aria-current", "true");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});

describe("deleting", () => {
  it("deletes a Question from its ⋯ menu after the Candidate confirms", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    renderApp();
    await setUpWithoutToken();
    await createInterview(NORTHWIND);
    await addQuestion(DISAGREED);

    await user.click(await screen.findByRole("button", { name: "More for this Question" }));
    await user.click(screen.getByRole("menuitem", { name: "Delete this Question" }));
    expect(confirm).toHaveBeenLastCalledWith(`Delete this Question? This can't be undone.\n\n"${DISAGREED}"`);
    expect(screen.getByRole("article", { name: "Question 1 of 1" })).toBeInTheDocument(); // cancelled

    await user.click(screen.getByRole("button", { name: "More for this Question" }));
    await user.click(screen.getByRole("menuitem", { name: "Delete this Question" }));

    expect(await screen.findByRole("region", { name: "No Questions yet" })).toBeInTheDocument();
    expect(screen.getByText("0 Questions")).toBeInTheDocument();
  });

  it("deletes an Interview and its Questions from the list after the Candidate confirms", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const { unmount } = renderApp();
    const unlockKey = await setUpWithoutToken();
    await createInterview(NORTHWIND);
    await addQuestion(DISAGREED);
    await questionCard(DISAGREED);
    await user.click(screen.getByRole("button", { name: "← Interviews" }));

    await user.click(await screen.findByRole("button", { name: "Delete Senior Product Engineer" }));

    expect(confirm).toHaveBeenCalledWith('Delete "Senior Product Engineer" and its 1 Question? This can\'t be undone.');
    await waitFor(() => expect(within(screen.getByRole("table", { name: "Interviews" })).queryAllByRole("row")).toHaveLength(1));
    unmount();

    renderApp();
    await unlockWith(unlockKey);
    expect(within(await screen.findByRole("table", { name: "Interviews" })).queryAllByRole("row")).toHaveLength(1);
  });
});

describe("the Interviews home", () => {
  it("has a Scenario Bank card that counts Scenarios and opens the bank", async () => {
    const user = userEvent.setup();
    renderApp();
    await setUpWithoutToken();

    const card = await screen.findByRole("region", { name: "Scenario Bank" });
    await waitFor(() => expect(card).toHaveTextContent("0 Scenarios"));
    await user.click(within(card).getByRole("button", { name: "Open Scenario Bank" }));

    expect(screen.getByRole("tab", { name: "Scenario Bank", selected: true })).toBeInTheDocument();
  });

  it("fills in a sample Job Spec, leaving the role to the Candidate", async () => {
    const user = userEvent.setup();
    renderApp();
    await setUpWithoutToken();
    await user.click(await screen.findByRole("button", { name: "+ New Interview" }));

    await user.click(screen.getByRole("button", { name: "Use a sample Job Spec" }));

    expect(screen.getByLabelText("Job Spec *")).toHaveDisplayValue(/fictional/i);
    expect(screen.getByLabelText("Role *")).toHaveValue("");
  });

  it("still lists the other Interviews when one can't be read, and says so", async () => {
    const user = userEvent.setup();
    const { unmount } = renderApp();
    const unlockKey = await setUpWithoutToken();
    await createInterview(NORTHWIND);
    await user.click(await screen.findByRole("button", { name: "← Interviews" }));
    await createInterview({ ...NORTHWIND, Role: "Staff Engineer" });
    await screen.findByRole("heading", { level: 1, name: /Staff Engineer/ });
    unmount();
    await corruptStoredRecord((id) => id.startsWith("interview:"));

    renderApp();
    await unlockWith(unlockKey);

    expect(await screen.findByRole("alert")).toHaveTextContent("1 Interview couldn't be read, so it isn't shown.");
    expect(within(screen.getByRole("table", { name: "Interviews" })).getAllByRole("row")).toHaveLength(2); // header + one
  });
});

describe("storage", () => {
  it("keeps Interviews only encrypted: no role, company, Job Spec or Question in plain text", async () => {
    renderApp();
    await setUpWithoutToken();
    await createInterview(NORTHWIND);
    await addQuestion(DISAGREED, "conflict");
    await questionCard(DISAGREED);

    const stored = await everythingStored();

    for (const plain of ["Senior Product Engineer", "Northwind", "warehouse tools", "disagreed", "conflict"]) expect(stored).not.toContain(plain);
  });
});
