import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { enterAccessToken, finishSetup, setUpWithoutToken, unlockWith } from "../test/candidate";
import { createFakeModelGateway } from "../test/fakeModelGateway";
import { renderApp } from "../test/renderApp";

const TOKEN = "IH-COHORT1-1Z3K9QT-7M2XD9PQRW4TK6BA";
const inHours = (hours: number) => new Date(Date.now() + hours * 3_600_000 + 60_000);
const gateway = (expiresAt = inHours(6)) =>
  createFakeModelGateway({ accessTokens: { [TOKEN]: { ok: true, label: "cohort1", expiresAt } } });

describe("the dashboard", () => {
  it("has the Scenario Bank tab, and Lock", async () => {
    renderApp();
    await setUpWithoutToken();

    expect(screen.getByRole("tab", { name: "Scenario Bank", selected: true })).toBeInTheDocument();
    expect(screen.getByRole("tabpanel", { name: "Scenario Bank" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lock" })).toBeInTheDocument();
  });

  it("shows how long the Access Token lasts, and opens it on a click", async () => {
    renderApp({ gateway: gateway() });
    await enterAccessToken(TOKEN);
    await finishSetup();

    const chip = await screen.findByRole("button", { name: "Access · 6h left" });
    expect(chip).toHaveAttribute("aria-expanded", "false");
    await userEvent.setup().click(chip);

    expect(chip).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/Access Token for cohort1 is active until/)).toBeVisible();
  });

  it("says when there's no Access Token", async () => {
    renderApp();
    await setUpWithoutToken();

    expect(screen.getByRole("button", { name: "Access · none" })).toBeInTheDocument();
  });

  it("opens the Access Token by itself when the stored one has expired", async () => {
    const { unmount } = renderApp({ gateway: gateway() });
    await enterAccessToken(TOKEN);
    const unlockKey = await finishSetup();
    unmount();

    renderApp({ gateway: createFakeModelGateway({ accessTokens: { [TOKEN]: { ok: false, reason: "expired" } } }) });
    await unlockWith(unlockKey);

    expect(await screen.findByText("Your Access Token has expired. Ask for a new one.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Access · none" })).toHaveAttribute("aria-expanded", "true");
  });
});
