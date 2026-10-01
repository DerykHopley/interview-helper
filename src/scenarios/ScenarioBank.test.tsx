import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { corruptStoredRecord, everythingStored } from "../test/browserStorage";
import { createScenario, fillScenario, openTab, setUpWithoutToken, unlockWith } from "../test/candidate";
import { renderApp } from "../test/renderApp";

/** Sets up, or unlocks, and opens the Scenario Bank tab (the dashboard opens on Interviews). */
async function setUpAndOpenBank() {
  const unlockKey = await setUpWithoutToken();
  await openTab("Scenario Bank");
  return unlockKey;
}
async function unlockAndOpenBank(unlockKey: string) {
  await unlockWith(unlockKey);
  await openTab("Scenario Bank");
}

const CHECKOUT = {
  Title: "Rescued the failing checkout migration",
  "Your role": "Tech lead",
  Situation: "The checkout rewrite was three months behind and the team was demoralised.",
  Task: "Take over as tech lead and get it live without another big slip.",
  Action: "Cut the scope to a strangler rollout, ran a 10-minute risk review every morning, and paired on the hardest parts.",
  Result: "It shipped three weeks late instead of three months.",
  Skills: "delivery under pressure, technical leadership",
  "Measurable results": "Checkout errors down 40%",
};

const MENTORING = {
  ...CHECKOUT,
  Title: "Mentored two juniors through their first on-call",
  Skills: "mentoring, incident response",
};

/** The Scenarios listed, by their text (title, skills and origin). */
const listed = () => within(screen.getByRole("list", { name: "Scenarios" })).queryAllByRole("button").map((b) => b.textContent);

describe("creating a Scenario by hand", () => {
  it("lists it with its title and skills, and shows it in full with its origin", async () => {
    renderApp();
    await setUpAndOpenBank();

    await createScenario(CHECKOUT);

    const list = screen.getByRole("list", { name: "Scenarios" });
    const item = within(list).getByRole("button", { name: /Rescued the failing checkout migration/ });
    expect(item).toHaveTextContent("delivery under pressure");
    expect(item).toHaveTextContent("technical leadership");
    const reader = screen.getByRole("article", { name: "Rescued the failing checkout migration" });
    for (const text of [CHECKOUT.Situation, CHECKOUT.Task, CHECKOUT.Action, CHECKOUT.Result, "Checkout errors down 40%", "Tech lead"]) {
      expect(reader).toHaveTextContent(text);
    }
    expect(reader).toHaveTextContent("Written by hand");
  });

  it("says which required parts are missing, and saves nothing until they're there", async () => {
    const user = userEvent.setup();
    renderApp();
    await setUpAndOpenBank();

    await createScenario({ Title: "Half a Scenario", Situation: "Something happened." });

    expect(screen.getByRole("alert")).toHaveTextContent("Still missing: your role, the Task, the Action, the Result, at least one skill.");
    expect(screen.getByLabelText("Task *")).toHaveAccessibleDescription("Add the Task");
    expect(within(screen.getByRole("list", { name: "Scenarios" })).queryAllByRole("listitem")).toHaveLength(0);

    await fillScenario({ "Your role": "Tech lead", Task: "t", Action: "a", Result: "r", Skills: "delivery" });
    await user.click(screen.getByRole("button", { name: "Save Scenario" }));

    expect(await screen.findByRole("article", { name: "Half a Scenario" })).toBeInTheDocument();
  });

  it("doesn't require measurable results, but suggests adding one", async () => {
    renderApp();
    await setUpAndOpenBank();
    await userEvent.setup().click(await screen.findByRole("button", { name: "+ New Scenario" }));
    await userEvent.setup().click(screen.getByRole("button", { name: /^Write it myself/ }));

    expect(screen.getByLabelText("Measurable results")).toHaveAccessibleDescription(/If you can, add a number or what changed/);

    await fillScenario({ ...CHECKOUT, "Measurable results": "" });
    await userEvent.setup().click(screen.getByRole("button", { name: "Save Scenario" }));

    expect(await screen.findByRole("article", { name: CHECKOUT.Title })).not.toHaveTextContent("Measurable results");
  });
});

describe("keeping Scenarios", () => {
  it("keeps them, exactly as typed, after a reload and unlock, and stores them only encrypted", async () => {
    const awkward = {
      ...CHECKOUT,
      Title: 'Said "no": to the CTO',
      Action: "First: I listed the risks.\n---\n## Result\nthen I # argued it out, 50% of the time",
      Skills: "influencing: senior stakeholders, conflict",
      "Measurable results": "Saved £120k\n- one bullet-looking line",
      Date: "2023",
    };
    const { unmount } = renderApp();
    const unlockKey = await setUpAndOpenBank();
    await createScenario(awkward);
    unmount();

    renderApp();
    await unlockAndOpenBank(unlockKey);
    await userEvent.setup().click(await screen.findByRole("button", { name: /Said "no": to the CTO/ }));

    const reader = screen.getByRole("article", { name: 'Said "no": to the CTO' });
    expect(within(reader).getByText(/^First: I listed the risks\./)).toHaveTextContent(
      "First: I listed the risks. --- ## Result then I # argued it out, 50% of the time",
      { normalizeWhitespace: true },
    );
    expect(within(reader).getByText(/^First:/).textContent).toBe(awkward.Action);
    expect(reader).toHaveTextContent("influencing: senior stakeholders");
    expect(within(reader).getByText("- one bullet-looking line")).toBeInTheDocument();
    expect(reader).toHaveTextContent("Tech lead · 2023");

    const stored = await everythingStored();
    for (const plain of ["CTO", "listed the risks", "influencing", "Tech lead", "£120k"]) expect(stored).not.toContain(plain);
  });
});

describe("editing and deleting", () => {
  it("edits a Scenario in place, keeping its origin, and keeps the change after a reload", async () => {
    const user = userEvent.setup();
    const { unmount } = renderApp();
    const unlockKey = await setUpAndOpenBank();
    await createScenario(CHECKOUT);

    await user.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByLabelText("Title *")).toHaveValue(CHECKOUT.Title);
    await fillScenario({ Result: "It shipped only three weeks late." });
    await user.click(screen.getByRole("button", { name: "Save Scenario" }));

    expect(await screen.findByRole("article", { name: CHECKOUT.Title })).toHaveTextContent("It shipped only three weeks late.");
    expect(within(screen.getByRole("list", { name: "Scenarios" })).getAllByRole("listitem")).toHaveLength(1);
    unmount();

    renderApp();
    await unlockAndOpenBank(unlockKey);
    await user.click(await screen.findByRole("button", { name: /Rescued the failing checkout migration/ }));
    const reader = screen.getByRole("article", { name: CHECKOUT.Title });
    expect(reader).toHaveTextContent("It shipped only three weeks late.");
    expect(reader).toHaveTextContent("Written by hand");
  });

  it("discards changes on Cancel", async () => {
    const user = userEvent.setup();
    renderApp();
    await setUpAndOpenBank();
    await createScenario(CHECKOUT);

    await user.click(screen.getByRole("button", { name: "Edit" }));
    await fillScenario({ Result: "Something else" });
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByRole("article", { name: CHECKOUT.Title })).toHaveTextContent(CHECKOUT.Result);
  });

  it("deletes a Scenario after the Candidate confirms, and it stays deleted after a reload", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const { unmount } = renderApp();
    const unlockKey = await setUpAndOpenBank();
    await createScenario(CHECKOUT);

    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(confirm).toHaveBeenCalledWith(`Delete "${CHECKOUT.Title}"? This can't be undone.`);
    await waitFor(() => expect(within(screen.getByRole("list", { name: "Scenarios" })).queryAllByRole("listitem")).toHaveLength(0));
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    unmount();

    renderApp();
    await unlockAndOpenBank(unlockKey);
    await screen.findByRole("button", { name: "+ New Scenario" });
    expect(within(screen.getByRole("list", { name: "Scenarios" })).queryAllByRole("listitem")).toHaveLength(0);
  });

  it("keeps the Scenario when the Candidate cancels the delete", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    renderApp();
    await setUpAndOpenBank();
    await createScenario(CHECKOUT);

    await userEvent.setup().click(screen.getByRole("button", { name: "Delete" }));

    expect(screen.getByRole("article", { name: CHECKOUT.Title })).toBeInTheDocument();
  });
});

describe("finding Scenarios", () => {
  it("searches titles and skills", async () => {
    const user = userEvent.setup();
    renderApp();
    await setUpAndOpenBank();
    await createScenario(CHECKOUT);
    await createScenario(MENTORING);

    await user.type(screen.getByRole("searchbox", { name: "Search titles and skills" }), "CHECKOUT");
    expect(listed()).toEqual([expect.stringContaining(CHECKOUT.Title)]);

    await user.clear(screen.getByRole("searchbox", { name: "Search titles and skills" }));
    await user.type(screen.getByRole("searchbox", { name: "Search titles and skills" }), "incident");
    expect(listed()).toEqual([expect.stringContaining(MENTORING.Title)]);
  });
});

describe("the skills overview", () => {
  const overview = () => screen.getByRole("region", { name: "Skills your Scenarios cover" });

  it("counts the skills the Scenarios cover, most first, ignoring capitals", async () => {
    renderApp();
    await setUpAndOpenBank();
    await createScenario(CHECKOUT);
    await createScenario({ ...MENTORING, Skills: "mentoring, Technical Leadership" });

    const rows = within(overview()).getAllByRole("button").map((b) => b.textContent);
    expect(rows[0]).toMatch(/technical leadership\s*2/i);
    expect(rows).toHaveLength(3);
  });

  it("filters the list by a skill, and clicking it again shows everything", async () => {
    const user = userEvent.setup();
    renderApp();
    await setUpAndOpenBank();
    await createScenario(CHECKOUT);
    await createScenario(MENTORING);

    await user.click(within(overview()).getByRole("button", { name: /mentoring/ }));
    expect(listed()).toEqual([expect.stringContaining(MENTORING.Title)]);
    expect(within(overview()).getByRole("button", { name: /mentoring/ })).toHaveAttribute("aria-pressed", "true");

    await user.click(within(overview()).getByRole("button", { name: /mentoring/ }));
    expect(listed()).toHaveLength(2);
  });

  it("folds into one line with Hide, and comes back with Show", async () => {
    const user = userEvent.setup();
    renderApp();
    await setUpAndOpenBank();
    await createScenario(CHECKOUT);

    await user.click(screen.getByRole("button", { name: "Hide skills overview" }));
    expect(screen.queryByRole("region", { name: "Skills your Scenarios cover" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /2 skills covered · Show/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /2 skills covered · Show/ }));
    expect(overview()).toBeInTheDocument();
  });
});

describe("the list", () => {
  it("is in title order", async () => {
    renderApp();
    await setUpAndOpenBank();
    await createScenario(CHECKOUT);
    await createScenario(MENTORING);
    await createScenario({ ...CHECKOUT, Title: "Built the feature flag system" });

    expect(listed()).toEqual([
      expect.stringContaining("Built the feature flag system"),
      expect.stringContaining(MENTORING.Title),
      expect.stringContaining(CHECKOUT.Title),
    ]);
  });
});

describe("when things go wrong", () => {
  it("saves once, however many times Save is clicked", async () => {
    const user = userEvent.setup();
    renderApp();
    await setUpAndOpenBank();
    await user.click(await screen.findByRole("button", { name: "+ New Scenario" }));
    await user.click(screen.getByRole("button", { name: /^Write it myself/ }));
    await fillScenario(CHECKOUT);

    await user.dblClick(screen.getByRole("button", { name: "Save Scenario" }));

    await screen.findByRole("article", { name: CHECKOUT.Title });
    expect(listed()).toHaveLength(1);
  });

  it("still shows the other Scenarios when one can't be read, and says so", async () => {
    const { unmount } = renderApp();
    const unlockKey = await setUpAndOpenBank();
    await createScenario(CHECKOUT);
    await createScenario(MENTORING);
    unmount();
    await corruptStoredRecord((id) => id.startsWith("scenario:"));

    renderApp();
    await unlockAndOpenBank(unlockKey);

    expect(await screen.findByRole("alert")).toHaveTextContent("1 Scenario couldn't be read, so it isn't shown.");
    expect(listed()).toHaveLength(1);
  });

  it("stores a skill typed twice only once", async () => {
    renderApp();
    await setUpAndOpenBank();

    await createScenario({ ...CHECKOUT, Skills: "Leadership, leadership, delivery" });

    expect(within(screen.getByRole("article", { name: CHECKOUT.Title })).getAllByText(/leadership/i)).toHaveLength(1);
  });
});

describe("filters that match nothing", () => {
  it("says so when a search matches no Scenario", async () => {
    renderApp();
    await setUpAndOpenBank();
    await createScenario(CHECKOUT);

    await userEvent.setup().type(screen.getByRole("searchbox", { name: "Search titles and skills" }), "zebra");

    expect(screen.getByText("No Scenarios match. Try another search, or clear the skill filter.")).toBeInTheDocument();
  });

  it("keeps the skill filter visible, and clearable, while the overview is hidden", async () => {
    const user = userEvent.setup();
    renderApp();
    await setUpAndOpenBank();
    await createScenario(CHECKOUT);
    await createScenario(MENTORING);

    await user.click(within(screen.getByRole("region", { name: "Skills your Scenarios cover" })).getByRole("button", { name: /mentoring/ }));
    await user.click(screen.getByRole("button", { name: "Hide skills overview" }));
    await user.click(screen.getByRole("button", { name: "Clear skill filter: mentoring" }));

    expect(listed()).toHaveLength(2);
  });

  it("drops the skill filter once no Scenario has that skill", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderApp();
    await setUpAndOpenBank();
    await createScenario(CHECKOUT);
    await createScenario(MENTORING);

    await user.click(within(screen.getByRole("region", { name: "Skills your Scenarios cover" })).getByRole("button", { name: /mentoring/ }));
    await user.click(screen.getByRole("button", { name: /Mentored two juniors/ }));
    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(listed()).toEqual([expect.stringContaining(CHECKOUT.Title)]));
    expect(screen.queryByRole("button", { name: /Clear skill filter/ })).not.toBeInTheDocument();
  });
});
