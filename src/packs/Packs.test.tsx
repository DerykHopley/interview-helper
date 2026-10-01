import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createScenario, enterAccessToken, finishSetup, openTab, setUpWithoutToken } from "../test/candidate";
import { createFakeModelGateway, type ReplyFor } from "../test/fakeModelGateway";
import { renderApp } from "../test/renderApp";

const TOKEN = "group-token";
const ACTIVE = { [TOKEN]: { ok: true as const, label: "Cohort 7", expiresAt: new Date("2099-01-01T00:00:00.000Z") } };

/** One Example Scenario block, in the Scenario format without an origin. `extra` adds header lines. */
const example = (title: string, extra = "") => `# Example Scenario

---
title: ${title}
role: Engineering manager
skills: [people leadership]
measurableResults: [Attrition down from 30% to 10%]
${extra}---

## Situation

Two seniors had just left and the team was missing every sprint goal.

## Task

Steady the team and get delivery back on track.

## Action

Held weekly one-to-ones, cut work in progress to two items, and paired seniors with juniors.

## Result

The team hit its sprint goals for five sprints in a row.
`;

const TURNAROUND = "Turned around a team that kept missing its goals";
const SCOPE_CALL = "Cut a launch's scope to hit the date";
const HEADER = `pack: Team Lead
interview:
  company: Northwind (fictional)
  jobSpec: Lead a team of six building warehouse tools.
questions:
  - text: Tell me about a time you turned a struggling team around.
    skill: people leadership
  - text: Describe a hard call you made on scope.
    skill: prioritisation
`;

/** A Pack file: the YAML header, then the Example Scenarios. */
const packText = ({ header = HEADER, examples = [example(TURNAROUND), example(SCOPE_CALL)] } = {}) => `---\n${header}---\n\n${examples.join("\n")}`;

const user = () => userEvent.setup();

/** One Scenario of the Candidate's own. */
const OWN = {
  Title: "Rescued the failing checkout migration",
  "Your role": "Tech lead",
  Situation: "The checkout rewrite was three months behind.",
  Task: "Get it live without another big slip.",
  Action: "Cut the scope to a staged rollout.",
  Result: "It shipped three weeks late instead of three months.",
  Skills: "delivery under pressure",
};
const OWN_LISTED = "Rescued the failing checkout migrationdelivery under pressureWritten by hand";

/** Chooses a file in the Backup tab's Packs panel (the tab must be open). */
async function importPack(text: string, name = "team-lead.pack.md") {
  await user().upload(screen.getByLabelText("Import a Pack file"), new File([text], name, { type: "text/markdown" }));
}

const preview = () => screen.findByRole("region", { name: "Pack preview" });

/** Imports a Pack file from the Backup tab and adds it, which opens its Interview. Returns how many Questions it has. */
async function addTestPack(text = packText(), questions = 2) {
  await openTab("Backup");
  await importPack(text);
  await user().click(within(await preview()).getByRole("button", { name: "Add this Pack" }));
  await screen.findByRole("article", { name: `Question 1 of ${questions}` });
}

/** Sets up and opens the Backup tab. */
async function setUpAndOpenBackup() {
  await setUpWithoutToken();
  await openTab("Backup");
}

/** The Scenarios listed in the Scenario Bank (which must be open), by their text (title, skills and origin). */
const listed = async () =>
  within(await screen.findByRole("list", { name: "Scenarios" }))
    .queryAllByRole("button")
    .map((b) => b.textContent);

describe("importing a Pack file", () => {
  it("previews what the Pack holds and what it will add, before anything is added", async () => {
    renderApp();
    await setUpAndOpenBackup();
    await importPack(packText());

    const shown = within(await preview());
    expect(shown.getByRole("heading", { name: "Team Lead" })).toBeInTheDocument();
    expect(shown.getByText("Northwind (fictional)")).toBeInTheDocument();
    expect(shown.getByText("Tell me about a time you turned a struggling team around.")).toBeInTheDocument();
    expect(shown.getByText(TURNAROUND)).toBeInTheDocument();
    expect(shown.getByText("Adds 1 Interview with 2 Questions, and 2 Demo Scenarios.")).toBeInTheDocument();

    // Nothing is added until the Candidate says so.
    await user().click(shown.getByRole("button", { name: "Cancel" }));
    await openTab("Scenario Bank");
    expect(await screen.findByText(/^No Scenarios yet\. Add your first/)).toBeInTheDocument();
    await openTab("Interviews");
    expect(await screen.findByText(/No Interviews yet/)).toBeInTheDocument();
  });

  it("adding it creates an Interview named after the Pack with its Questions, and copies its Example Scenarios in as Demo Scenarios", async () => {
    renderApp();
    await setUpAndOpenBackup();
    await importPack(packText());
    await user().click(within(await preview()).getByRole("button", { name: "Add this Pack" }));

    // It opens the new Interview.
    expect(await screen.findByRole("heading", { level: 1, name: /Team Lead/ })).toHaveTextContent("Northwind (fictional)");
    const first = screen.getByRole("article", { name: "Question 1 of 2" });
    expect(first).toHaveTextContent("people leadership");
    expect(first).toHaveTextContent("Tell me about a time you turned a struggling team around.");
    expect(first).not.toHaveTextContent("typed by you");

    await user().click(screen.getByRole("button", { name: "← Interviews" }));
    await openTab("Scenario Bank");
    expect(await listed()).toEqual([`${SCOPE_CALL}people leadershipDemo`, `${TURNAROUND}people leadershipDemo`]);
  });

  const withoutQuestionSkill = HEADER.replace("    skill: prioritisation\n", "");
  it.each([
    ["isn't a Pack at all", "Just some notes about my week.", "That isn't a file this app can read."],
    ["has a header that isn't YAML", "---\npack: [Team Lead\n---\n", "This Pack can't be used: its header isn't valid YAML."],
    ["has no name", packText({ header: HEADER.replace("pack: Team Lead\n", "") }), "This Pack can't be used: it has no name (pack:)."],
    ["has no Questions", packText({ header: "pack: Team Lead\n" }), "This Pack can't be used: it has no Questions."],
    ["has a Question without a skill", packText({ header: withoutQuestionSkill }), "This Pack can't be used: Question 2 has no skill."],
    ["has no Example Scenarios", packText({ examples: [] }), "This Pack can't be used: it has no Example Scenarios."],
    [
      "has an Example Scenario missing a part",
      packText({ examples: [example(TURNAROUND), example(SCOPE_CALL).replace(/## Result[\s\S]*$/, "")] }),
      "This Pack can't be used: Example Scenario 2 has no Result section.",
    ],
    [
      "has text outside an Example Scenario",
      packText({ examples: ["## Example Scenario\n\nA heading one level too deep.\n"] }),
      "This Pack can't be used: only Example Scenarios, each under a “# Example Scenario” line, can follow the header.",
    ],
    [
      "gives an Example Scenario an origin",
      packText({ examples: [example(TURNAROUND, "origin: hand-written\n")] }),
      "This Pack can't be used: Example Scenario 1 gives an origin. Leave it out: every Example Scenario becomes a Demo Scenario.",
    ],
    ["is too large", packText({ examples: [example(TURNAROUND + "x".repeat(300_000))] }), "This Pack can't be used: it's larger than 200 KB."],
  ])("rejects a file that %s, with the reason, and changes nothing", async (_, text, reason) => {
    renderApp();
    await setUpAndOpenBackup();
    await importPack(text);

    expect(await screen.findByRole("alert")).toHaveTextContent(reason);
    expect(screen.queryByRole("region", { name: "Pack preview" })).not.toBeInTheDocument();
    await openTab("Scenario Bank");
    expect(await screen.findByText(/^No Scenarios yet\. Add your first/)).toBeInTheDocument();
    await openTab("Interviews");
    expect(await screen.findByText(/No Interviews yet/)).toBeInTheDocument();
  });

  it("shows a Pack's text as plain text only", async () => {
    const hostile = "<img src=x onerror=alert(1)>";
    renderApp();
    await setUpAndOpenBackup();
    await importPack(packText({ header: HEADER.replace("Tell me about a time you turned a struggling team around.", `"${hostile}"`), examples: [example(hostile)] }));

    const shown = await preview();
    expect(within(shown).getAllByText(hostile)).toHaveLength(2);
    expect(shown.querySelector("img")).toBeNull();
  });

  it("choosing the same Pack again makes a new Interview, but skips Example Scenarios already here as Demo Scenarios", async () => {
    renderApp();
    await setUpWithoutToken();
    await addTestPack(packText({ examples: [example(TURNAROUND)] }));
    await user().click(screen.getByRole("button", { name: "← Interviews" }));

    await openTab("Backup");
    await importPack(packText());
    const shown = within(await preview());
    expect(shown.getByText("Adds 1 Interview with 2 Questions, and 1 Demo Scenario. Skips 1 Example Scenario already in your Scenario Bank.")).toBeInTheDocument();
    const examples = within(shown.getByRole("list", { name: "Example Scenarios" })).getAllByRole("listitem").map((li) => li.textContent);
    expect(examples).toEqual([`${TURNAROUND} · already here`, SCOPE_CALL]);
    await user().click(shown.getByRole("button", { name: "Add this Pack" }));
    await screen.findByRole("article", { name: "Question 1 of 2" });

    await user().click(screen.getByRole("button", { name: "← Interviews" }));
    expect(within(await screen.findByRole("table", { name: "Interviews" })).getAllByText("Team Lead")).toHaveLength(2);
    await openTab("Scenario Bank");
    expect(await listed()).toEqual([`${SCOPE_CALL}people leadershipDemo`, `${TURNAROUND}people leadershipDemo`]);
  });

  it("never matches an Example Scenario that wasn't copied in", async () => {
    const sent: string[] = [];
    const scoreAll: ReplyFor = ({ user: text }) => {
      sent.push(text);
      const scenarios = JSON.parse(text.split("Scenarios:\n")[1]) as { id: string }[];
      return { scores: scenarios.map(({ id }) => ({ id, score: 90 })) };
    };
    const reasonAll: ReplyFor = ({ user: text }) => ({
      reasons: (JSON.parse(text.split("Scenarios:\n")[1]) as { id: string }[]).map(({ id }) => ({ id, reason: "It fits." })),
    });
    const gateway = createFakeModelGateway({ generate: { matching: [scoreAll], "match-reasons": [reasonAll] } });
    renderApp({ gateway });
    await setUpWithoutToken();

    // Preview a Pack without adding it, then add one Scenario of the Candidate's own.
    await openTab("Backup");
    await importPack(packText());
    await user().click(within(await preview()).getByRole("button", { name: "Cancel" }));
    await openTab("Scenario Bank");
    await createScenario(OWN);

    await openTab("Interviews");
    await user().click(await screen.findByRole("button", { name: "+ New Interview" }));
    await user().type(screen.getByLabelText("Role *"), "Team Lead");
    await user().type(screen.getByLabelText("Job Spec *"), "Lead a team.");
    await user().click(screen.getByRole("button", { name: "Create without Questions" }));
    await user().type(await screen.findByLabelText("Your Question"), "Tell me about a time you turned a struggling team around.");
    await user().click(screen.getByRole("button", { name: "Add Question" }));
    await user().click(await screen.findByRole("button", { name: "Find my Matches" }));

    expect(await screen.findByRole("list", { name: "Matches" })).toHaveTextContent("Rescued the failing checkout migration");
    expect(sent).toHaveLength(1);
    expect(sent[0]).not.toContain(TURNAROUND);
    expect(sent[0]).not.toContain(SCOPE_CALL);
  });
});

describe("a Pack's Interview", () => {
  it("with a Job Spec, can ask for more Questions like any other", async () => {
    const gateway = createFakeModelGateway({ accessTokens: ACTIVE });
    renderApp({ gateway });
    await enterAccessToken(TOKEN);
    await finishSetup();
    await addTestPack();

    await user().click(screen.getByRole("button", { name: "Next Question" }));
    await user().click(screen.getByRole("button", { name: "Next Question" }));
    expect(screen.getByRole("button", { name: /Ask for \d+ more Questions/ })).toBeEnabled();
  });

  it("without a Job Spec, offers no Questions to be written, but takes typed ones", async () => {
    const gateway = createFakeModelGateway({ accessTokens: ACTIVE });
    renderApp({ gateway });
    await enterAccessToken(TOKEN);
    await finishSetup();
    await addTestPack(packText({ header: HEADER.replace("  jobSpec: Lead a team of six building warehouse tools.\n", "") }));

    await user().click(screen.getByRole("button", { name: "Next Question" }));
    await user().click(screen.getByRole("button", { name: "Next Question" }));
    expect(screen.queryByRole("button", { name: /more Questions/ })).not.toBeInTheDocument();
    await user().type(screen.getByLabelText("Your Question"), "Why this team?");
    await user().click(screen.getByRole("button", { name: "Add Question" }));
    expect(await screen.findByRole("article", { name: "Question 3 of 3" })).toHaveTextContent("Why this team?");
  });
});

describe("the shipped Packs", () => {
  it.each(["Engineering Manager", "Software Developer"])("%s is offered on the Backup tab and can be added", async (name) => {
    renderApp();
    await setUpAndOpenBackup();
    await user().click(await screen.findByRole("button", { name: new RegExp(`^${name}`) }));
    const shown = within(await preview());
    expect(shown.getByRole("heading", { name })).toBeInTheDocument();
    await user().click(shown.getByRole("button", { name: "Add this Pack" }));
    expect(await screen.findByRole("heading", { level: 1, name: new RegExp(name) })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: /^Question 1 of \d+$/ })).toBeInTheDocument();
  });

  it.each(["Engineering Manager", "Software Developer"])("setup's step 3 can start from the %s Pack, opening its Interview", async (name) => {
    renderApp();
    await user().click(await screen.findByRole("button", { name: "I don't have one yet" }));
    await user().click(await screen.findByLabelText(/I've saved my Unlock Key/));
    await user().click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("button", { name: /Start with my own Scenarios/ })).toBeInTheDocument();
    await user().click(screen.getByRole("button", { name: new RegExp(`^Start from the ${name} Pack`) }));

    expect(await screen.findByRole("heading", { level: 1, name: new RegExp(name) })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: /^Question 1 of \d+$/ })).toBeInTheDocument();
    await user().click(screen.getByRole("button", { name: "← Interviews" }));
    await openTab("Scenario Bank");
    const scenarios = await listed();
    expect(scenarios.length).toBeGreaterThan(0);
    expect(scenarios.every((s) => s?.endsWith("Demo"))).toBe(true);
  });
});

describe("Demo Scenarios", () => {
  /** Sets up, adds one Scenario of the Candidate's own, then the test Pack (2 Demo Scenarios). */
  async function ownAndDemo() {
    await setUpWithoutToken();
    await openTab("Scenario Bank");
    await createScenario(OWN);
    await addTestPack();
    await user().click(screen.getByRole("button", { name: "← Interviews" }));
  }

  it("are editable like any other Scenario, and stay Demo", async () => {
    renderApp();
    await ownAndDemo();
    await openTab("Scenario Bank");
    await user().click(await screen.findByRole("button", { name: new RegExp(`^${TURNAROUND}`) }));
    await user().click(screen.getByRole("button", { name: "Edit" }));
    const title = screen.getByLabelText(/^Title/);
    await user().clear(title);
    await user().type(title, "Steadied a team after two seniors left");
    await user().click(screen.getByRole("button", { name: "Save Scenario" }));

    await waitFor(async () => expect(await listed()).toContain("Steadied a team after two seniors leftpeople leadershipDemo"));
  });

  it("are all removed by the Scenario Bank's demo bar, leaving the Candidate's own", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderApp();
    await ownAndDemo();
    await openTab("Scenario Bank");
    expect(await screen.findByText("2 demo Scenarios")).toBeInTheDocument();
    await user().click(screen.getByRole("button", { name: "Remove all demo" }));

    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("Remove 2 demo Scenarios?"));
    await waitFor(async () => expect(await listed()).toEqual([OWN_LISTED]));
    expect(screen.queryByText(/demo Scenario/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove all demo" })).not.toBeInTheDocument();
    confirm.mockRestore();
  });

  it("are all removed by the dashboard's Remove demo card, which then goes", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderApp();
    await ownAndDemo();
    const card = within(await screen.findByRole("region", { name: "Scenario Bank" }));
    expect(await card.findByText(/2 demo/)).toBeInTheDocument();
    await user().click(card.getByRole("button", { name: "Remove demo" }));

    await waitFor(() => expect(card.queryByRole("button", { name: "Remove demo" })).not.toBeInTheDocument());
    expect(card.getByText("1")).toBeInTheDocument();
    await openTab("Scenario Bank");
    expect(await listed()).toEqual([OWN_LISTED]);
    confirm.mockRestore();
  });

  it("aren't removed when the Candidate cancels", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderApp();
    await ownAndDemo();
    await openTab("Scenario Bank");
    await user().click(await screen.findByRole("button", { name: "Remove all demo" }));
    expect(await listed()).toHaveLength(3);
    confirm.mockRestore();
  });
});
