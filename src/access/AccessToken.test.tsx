import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ModelGatewayError, type AccessStatus } from "../model-gateway/ModelGateway";
import { createFakeModelGateway } from "../test/fakeModelGateway";
import { enterAccessToken, finishSetup, setUpWithoutToken, unlockWith } from "../test/candidate";
import { renderApp } from "../test/renderApp";

const ACTIVE = "IH-COHORT1-1Z3K9QT-7M2XD9PQRW4TK6BA";
const EXPIRED = "IH-COHORT1-1A00000-0000000000000000";
const gateway = () =>
  createFakeModelGateway({
    accessTokens: {
      [ACTIVE]: { ok: true, label: "cohort1", expiresAt: new Date("2099-01-01T08:00:00Z") },
      [EXPIRED]: { ok: false, reason: "expired" },
    },
  });

describe("entering an Access Token", () => {
  it("shows the Candidate their access is active", async () => {
    renderApp({ gateway: gateway() });

    await enterAccessToken(ACTIVE);

    expect(await screen.findByText(/cohort1, active until/)).toBeInTheDocument();
  });

  it("tells the Candidate when a token isn't recognised", async () => {
    renderApp({ gateway: gateway() });

    await enterAccessToken("IH-SOMETHING-WRONG");

    expect(await screen.findByText("That token isn't recognised. Check it with whoever gave it to you.")).toBeInTheDocument();
  });

  it("tells the Candidate when a token has expired", async () => {
    renderApp({ gateway: gateway() });

    await enterAccessToken(EXPIRED);

    expect(await screen.findByText("That token has expired. Ask for a new one.")).toBeInTheDocument();
  });

  it("keeps the token in the Vault, so it's still active after a reload and unlock", async () => {
    const { unmount } = renderApp({ gateway: gateway() });
    await enterAccessToken(ACTIVE);
    const unlockKey = await finishSetup();
    unmount();

    renderApp({ gateway: gateway() });
    await unlockWith(unlockKey);

    expect(await screen.findByText(/Access Token for cohort1 is active/)).toBeInTheDocument();
  });

  it("tells the Candidate when the app's server can't be reached, and lets them try again", async () => {
    const unreachable = { ...gateway(), checkAccess: () => Promise.reject(new ModelGatewayError("worker_unreachable")) };
    renderApp({ gateway: unreachable });

    await enterAccessToken(ACTIVE);

    expect(await screen.findByText("Couldn't reach the app's server. Check your connection and try again.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
  });

  it("tells the Candidate when the token they entered earlier has since expired", async () => {
    const { unmount } = renderApp({ gateway: gateway() });
    await enterAccessToken(ACTIVE);
    const unlockKey = await finishSetup();
    unmount();

    renderApp({ gateway: createFakeModelGateway({ accessTokens: { [ACTIVE]: { ok: false, reason: "expired" } } }) });
    await unlockWith(unlockKey);

    expect(await screen.findByText("Your Access Token has expired. Ask for a new one.")).toBeInTheDocument();
  });

  it("still has the token after the Candidate double-clicks to finish setup", async () => {
    const user = userEvent.setup();
    const { unmount } = renderApp({ gateway: gateway() });
    await enterAccessToken(ACTIVE);
    const unlockKey = (await screen.findByLabelText("Your Unlock Key")).textContent;
    await user.click(screen.getByLabelText(/I've saved my Unlock Key/));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.dblClick(screen.getByRole("button", { name: /Start with my own Scenarios/ }));
    await screen.findByRole("button", { name: "Lock" });
    unmount();

    renderApp({ gateway: gateway() });
    await unlockWith(unlockKey);

    expect(await screen.findByText(/Access Token for cohort1 is active/)).toBeInTheDocument();
  });

  it("drops a token check that finishes after the app was locked", async () => {
    const user = userEvent.setup();
    let answer: (status: AccessStatus) => void = () => {};
    const slow = { ...gateway(), checkAccess: () => new Promise<AccessStatus>((resolve) => (answer = resolve)) };
    renderApp({ gateway: slow });
    const unlockKey = await setUpWithoutToken();

    await user.click(await screen.findByRole("button", { name: "Access · none" }));
    await enterAccessToken(ACTIVE);
    await user.click(screen.getByRole("button", { name: "Lock" }));
    await act(() => Promise.resolve(answer({ ok: true, label: "cohort1", expiresAt: new Date("2099-01-01T08:00:00Z") })));

    expect(slow.accessTokenToSend()).toBeNull();
    await unlockWith(unlockKey);
    expect(await screen.findByLabelText("Access Token")).toHaveValue("");
  });

  it("keeps sending the stored token when the Worker can't be reached at unlock", async () => {
    const { unmount } = renderApp({ gateway: gateway() });
    await enterAccessToken(ACTIVE);
    const unlockKey = await finishSetup();
    unmount();

    const offline = { ...gateway(), checkAccess: () => Promise.reject(new ModelGatewayError("worker_unreachable")) };
    renderApp({ gateway: offline });
    await unlockWith(unlockKey);

    expect(await screen.findByText("Couldn't reach the app's server. Check your connection and try again.")).toBeInTheDocument();
    expect(offline.accessTokenToSend()).toBe(ACTIVE);
  });
});

describe("running it with npm run local (#63)", () => {
  it("fills in the token npm run local minted, so setup only needs Continue", async () => {
    vi.stubEnv("VITE_LOCAL_ACCESS_TOKEN", ACTIVE);
    const user = userEvent.setup();
    renderApp({ gateway: gateway() });

    expect(await screen.findByLabelText("Access Token")).toHaveValue(ACTIVE);
    expect(screen.getByText("Filled in by npm run local.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText(/cohort1, active until/)).toBeInTheDocument();
  });

  it("leaves the field empty when the app wasn't started that way", async () => {
    renderApp({ gateway: gateway() });

    expect(await screen.findByLabelText("Access Token")).toHaveValue("");
    expect(screen.queryByText("Filled in by npm run local.")).not.toBeInTheDocument();
  });
});
