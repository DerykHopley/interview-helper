import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ModelGatewayError, type AccessStatus } from "../model-gateway/ModelGateway";
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

  it("says the token is being checked, and when it couldn't be checked, rather than \"none\"", async () => {
    const { unmount } = renderApp({ gateway: gateway() });
    await enterAccessToken(TOKEN);
    const unlockKey = await finishSetup();
    unmount();

    let fail: ((e: Error) => void) | null = null;
    const offline = { ...gateway(), checkAccess: () => new Promise<AccessStatus>((_, reject) => (fail = reject)) };
    renderApp({ gateway: offline });
    await unlockWith(unlockKey);

    await vi.waitFor(() => expect(fail).not.toBeNull()); // the Worker has been asked
    expect(screen.getByRole("button", { name: "Access · checking…" })).toBeInTheDocument();
    await act(() => Promise.resolve(fail!(new ModelGatewayError("worker_unreachable"))));
    expect(await screen.findByRole("button", { name: "Access · not checked" })).toBeInTheDocument();
  });

  it("keeps a newly entered token even if the old one's check comes back expired afterwards", async () => {
    const user = userEvent.setup();
    const NEW = "IH-COHORT2-1Z3K9QT-7M2XD9PQRW4TK6BA";
    const { unmount } = renderApp({ gateway: gateway() });
    await enterAccessToken(TOKEN);
    const unlockKey = await finishSetup();
    unmount();

    let answerOld: (status: AccessStatus) => void = () => {};
    const slowOld = {
      ...gateway(),
      checkAccess: (token: string) =>
        token === TOKEN
          ? new Promise<AccessStatus>((resolve) => (answerOld = resolve))
          : Promise.resolve<AccessStatus>({ ok: true, label: "cohort2", expiresAt: inHours(6) }),
    };
    renderApp({ gateway: slowOld });
    await unlockWith(unlockKey);
    await user.click(await screen.findByRole("button", { name: "Access · checking…" }));
    await enterAccessToken(NEW);
    await screen.findByText(/Access Token for cohort2 is active/);

    await act(() => Promise.resolve(answerOld({ ok: false, reason: "expired" })));

    expect(screen.getByText(/Access Token for cohort2 is active/)).toBeInTheDocument();
    expect(slowOld.accessTokenToSend()).toBe(NEW);
  });
});
