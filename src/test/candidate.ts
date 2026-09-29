// What a Candidate does to get into the app, shared by the app-boundary tests.
import { screen, waitFor } from "@testing-library/react";
import { expect } from "vitest";
import userEvent from "@testing-library/user-event";

const user = () => userEvent.setup();

export async function enterAccessToken(token: string) {
  await user().type(await screen.findByLabelText("Access Token"), token);
  await user().click(screen.getByRole("button", { name: "Continue" }));
}

let lastKey = "";
/** The Unlock Key from the most recent setup, for tests whose setup happens inside a helper. */
export const lastUnlockKey = () => lastKey;

/** Finishes first-visit setup, from the Unlock Key step on, and returns the Unlock Key the app showed. */
export async function finishSetup() {
  const unlockKey = (await screen.findByLabelText("Your Unlock Key")).textContent;
  lastKey = unlockKey;
  await user().click(screen.getByLabelText(/I've saved my Unlock Key/));
  await user().click(screen.getByRole("button", { name: "Continue" }));
  await user().click(screen.getByRole("button", { name: /Start with my own Scenarios/ }));
  await screen.findByRole("button", { name: "Lock" });
  return unlockKey;
}

/** First-visit setup without an Access Token. Returns the Unlock Key. */
export async function setUpWithoutToken() {
  await user().click(await screen.findByRole("button", { name: "I don't have one yet" }));
  return finishSetup();
}

export async function unlockWith(unlockKey: string) {
  await user().type(await screen.findByLabelText("Unlock Key"), unlockKey);
  await user().click(screen.getByRole("button", { name: "Unlock" }));
}

/** Opens one of the dashboard's tabs (Interviews, Scenario Bank). */
export async function openTab(name: string) {
  await user().click(await screen.findByRole("tab", { name }));
}

/** Fills in the Scenario form, field by field, as labelled. */
export async function fillScenario(fields: Record<string, string>) {
  for (const [label, value] of Object.entries(fields)) {
    const field = screen.getByLabelText(new RegExp(`^${label}( \\*)?$`));
    await user().clear(field);
    if (value) await user().type(field, value);
  }
}

/** Creates a Scenario from the Scenario Bank (which must be open), and waits for the save to finish: the form has
 * closed, or it's showing what's missing. */
export async function createScenario(fields: Record<string, string>) {
  await user().click(await screen.findByRole("button", { name: "+ New Scenario" }));
  await fillScenario(fields);
  await user().click(screen.getByRole("button", { name: "Save Scenario" }));
  await waitFor(() => expect(!screen.queryByRole("button", { name: "Save Scenario" }) || screen.queryByText(/^Still missing/)).toBeTruthy());
}
