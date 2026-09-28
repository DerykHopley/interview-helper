import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ModelGatewayError } from "../model-gateway/ModelGateway";
import { createFakeModelGateway } from "../test/fakeModelGateway";
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

async function enterToken(token: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Access Token"), token);
  await user.click(screen.getByRole("button", { name: "Continue" }));
}

describe("entering an Access Token", () => {
  it("shows the Candidate their access is active", async () => {
    renderApp({ gateway: gateway() });

    await enterToken(ACTIVE);

    expect(await screen.findByText(/Access Token for cohort1 is active/)).toBeInTheDocument();
  });

  it("tells the Candidate when a token isn't recognised", async () => {
    renderApp({ gateway: gateway() });

    await enterToken("IH-SOMETHING-WRONG");

    expect(await screen.findByText("That token isn't recognised. Check it with whoever gave it to you.")).toBeInTheDocument();
  });

  it("tells the Candidate when a token has expired", async () => {
    renderApp({ gateway: gateway() });

    await enterToken(EXPIRED);

    expect(await screen.findByText("That token has expired. Ask for a new one.")).toBeInTheDocument();
  });

  it("remembers the token after a reload, for as long as the tab is open", async () => {
    const { unmount } = renderApp({ gateway: gateway() });
    await enterToken(ACTIVE);
    await screen.findByText(/Access Token for cohort1 is active/);
    unmount();

    renderApp({ gateway: gateway() });

    expect(await screen.findByText(/Access Token for cohort1 is active/)).toBeInTheDocument();
  });

  it("tells the Candidate when the app's server can't be reached, and lets them try again", async () => {
    const unreachable = { ...gateway(), checkAccess: () => Promise.reject(new ModelGatewayError("worker_unreachable")) };
    renderApp({ gateway: unreachable });

    await enterToken(ACTIVE);

    expect(await screen.findByText("Couldn't reach the app's server. Check your connection and try again.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
  });

  it("tells the Candidate when the token they entered earlier has since expired", async () => {
    const { unmount } = renderApp({ gateway: gateway() });
    await enterToken(ACTIVE);
    await screen.findByText(/Access Token for cohort1 is active/);
    unmount();

    renderApp({ gateway: createFakeModelGateway({ accessTokens: { [ACTIVE]: { ok: false, reason: "expired" } } }) });

    expect(await screen.findByText("Your Access Token has expired. Ask for a new one.")).toBeInTheDocument();
  });
});
