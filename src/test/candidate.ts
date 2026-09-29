// What a Candidate does to get into the app, shared by the app-boundary tests.
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const user = () => userEvent.setup();

export async function enterAccessToken(token: string) {
  await user().type(await screen.findByLabelText("Access Token"), token);
  await user().click(screen.getByRole("button", { name: "Continue" }));
}

/** Finishes first-visit setup, from the Unlock Key step on, and returns the Unlock Key the app showed. */
export async function finishSetup() {
  const unlockKey = (await screen.findByLabelText("Your Unlock Key")).textContent;
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
