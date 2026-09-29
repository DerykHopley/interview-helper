import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { everythingStored } from "../test/browserStorage";
import { enterAccessToken, finishSetup, setUpWithoutToken as setUp, unlockWith } from "../test/candidate";
import { createFakeModelGateway } from "../test/fakeModelGateway";
import { renderApp } from "../test/renderApp";

const UNLOCK_KEY = /^[0-9A-HJKMNP-TV-Z]{4}(-[0-9A-HJKMNP-TV-Z]{4}){5}$/; // 6 groups of 4, Crockford base32

describe("first visit", () => {
  it("shows a new Unlock Key once, warns it can't be recovered, and waits until the Candidate has saved it", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(await screen.findByRole("button", { name: "I don't have one yet" }));

    expect(screen.getByLabelText("Your Unlock Key")).toHaveTextContent(UNLOCK_KEY);
    expect(screen.getByText(/We only show this once/)).toBeInTheDocument();
    expect(screen.getByText(/your stories can't be recovered/)).toBeInTheDocument();
    const next = screen.getByRole("button", { name: "Continue" });
    expect(next).toBeDisabled();

    await user.click(screen.getByLabelText(/I've saved my Unlock Key/));

    expect(next).toBeEnabled();
  });
});

describe("returning", () => {
  it("unlocks with the Unlock Key saved at setup", async () => {
    const { unmount } = renderApp();
    const unlockKey = await setUp();
    unmount();

    renderApp();
    expect(await screen.findByRole("heading", { name: "Unlock your stories" })).toBeInTheDocument();
    await unlockWith(unlockKey);

    expect(await screen.findByRole("button", { name: "Lock" })).toBeInTheDocument();
  });

  it("says a wrong key doesn't match, without trying to decrypt anything", async () => {
    const { unmount } = renderApp();
    await setUp();
    unmount();
    const decrypt = vi.spyOn(crypto.subtle, "decrypt");

    renderApp();
    await unlockWith("7KQF-M2XD-9HRT-4VNC-P8WB-3JZE");

    expect(await screen.findByText(/That key doesn't match/)).toBeInTheDocument();
    expect(decrypt).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Lock" })).not.toBeInTheDocument();
  });
});

describe("what's stored in the browser", () => {
  const TOKEN = "IH-COHORT1-1Z3K9QT-7M2XD9PQRW4TK6BA";
  const gateway = () =>
    createFakeModelGateway({ accessTokens: { [TOKEN]: { ok: true, label: "cohort1", expiresAt: new Date("2099-01-01T08:00:00Z") } } });

  it("is all encrypted: no plain text, and never the Unlock Key", async () => {
    renderApp({ gateway: gateway() });
    await enterAccessToken(TOKEN);
    const unlockKey = await finishSetup();

    const stored = await everythingStored();

    expect(stored).not.toContain(TOKEN);
    expect(stored).not.toContain("cohort1");
    expect(stored).not.toContain(unlockKey);
    expect(stored).not.toContain(unlockKey.replaceAll("-", ""));
  });
});

describe("locking", () => {
  const MINUTE = 60_000;
  // Only the clock is faked, and it keeps moving on its own, so setup (storage, Web Crypto) still runs normally.
  const useFakeClock = () => vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"], shouldAdvanceTime: true });

  it("locks when the Candidate asks, and needs the Unlock Key again", async () => {
    renderApp();
    const unlockKey = await setUp();

    await userEvent.setup().click(screen.getByRole("button", { name: "Lock" }));

    expect(await screen.findByRole("heading", { name: "Unlock your stories" })).toBeInTheDocument();
    await unlockWith(unlockKey);
    expect(await screen.findByRole("button", { name: "Lock" })).toBeInTheDocument();
  });

  it("locks by itself after 15 minutes without activity", async () => {
    useFakeClock();
    renderApp();
    await setUp();

    act(() => { vi.advanceTimersByTime(14 * MINUTE); });
    expect(screen.getByRole("button", { name: "Lock" })).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(1 * MINUTE); });

    expect(screen.getByRole("heading", { name: "Unlock your stories" })).toBeInTheDocument();
  });

  it("counts the 15 minutes from the Candidate's last activity", async () => {
    useFakeClock();
    renderApp();
    await setUp();

    act(() => { vi.advanceTimersByTime(10 * MINUTE); });
    act(() => { document.dispatchEvent(new KeyboardEvent("keydown", { key: "a", bubbles: true })); });
    act(() => { vi.advanceTimersByTime(10 * MINUTE); });

    expect(screen.getByRole("button", { name: "Lock" })).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(5 * MINUTE); });
    expect(screen.getByRole("heading", { name: "Unlock your stories" })).toBeInTheDocument();
  });
});

describe("starting over", () => {
  it("after typing DELETE, wipes everything and runs first-visit setup with a new Unlock Key", async () => {
    const user = userEvent.setup();
    const { unmount } = renderApp();
    const oldKey = await setUp();
    unmount();

    renderApp();
    await user.click(await screen.findByRole("button", { name: "Lost your Unlock Key? Start over" }));
    const confirm = screen.getByRole("button", { name: "Delete everything and start over" });
    expect(confirm).toBeDisabled();
    await user.type(screen.getByLabelText("Confirmation word"), "delete");
    await user.click(confirm);

    await user.click(await screen.findByRole("button", { name: "I don't have one yet" }));
    expect(screen.getByLabelText("Your Unlock Key")).not.toHaveTextContent(oldKey);
    expect(await everythingStored()).toBe("");
  });

  it("can be cancelled when the Candidate finds their key", async () => {
    const user = userEvent.setup();
    const { unmount } = renderApp();
    const unlockKey = await setUp();
    unmount();

    renderApp();
    await user.click(await screen.findByRole("button", { name: "Lost your Unlock Key? Start over" }));
    await user.click(screen.getByRole("button", { name: "Cancel — I found my key" }));
    await unlockWith(unlockKey);

    expect(await screen.findByRole("button", { name: "Lock" })).toBeInTheDocument();
  });
});

describe("persistent storage", () => {
  it("asks the browser to keep the app's data when the Candidate sets up", async () => {
    // jsdom has no StorageManager, so this stands in for the browser's.
    const persist = vi.fn(() => Promise.resolve(true));
    Object.defineProperty(navigator, "storage", { value: { persist }, configurable: true });
    try {
      renderApp();
      await setUp();

      expect(persist).toHaveBeenCalled();
    } finally {
      Reflect.deleteProperty(navigator, "storage");
    }
  });
});
