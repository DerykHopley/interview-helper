import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ModelGatewayError } from "../model-gateway/ModelGateway";
import { openTab, setUpWithoutToken } from "../test/candidate";
import { createFakeModelGateway } from "../test/fakeModelGateway";
import { FakeRecorder, microphone, microphoneOn, removeMicrophone } from "../test/microphone";
import { renderApp } from "../test/renderApp";

const SPOKEN = "I opened an incident call and split the team in two.";

afterEach(removeMicrophone);

const user = () => userEvent.setup();

/** Sets up without an Access Token and opens the Engineering Manager Pack's Interview. */
async function inThePackInterview(gateway = createFakeModelGateway({ transcripts: [SPOKEN] })) {
  renderApp({ gateway });
  await setUpWithoutToken();
  await openTab("Backup");
  await user().click(await screen.findByRole("button", { name: /^Engineering Manager/ }));
  await user().click(await screen.findByRole("button", { name: "Add this Pack" }));
  await screen.findByRole("article", { name: "Question 1 of 6" });
}

const answerBox = () => screen.getByLabelText("Your answer");
const mic = () => screen.getByRole("button", { name: /^(Record your answer|Stop recording)$/ });

describe("speaking an answer", () => {
  it("explains the one-time download before the first use, then records and adds what was said", async () => {
    const { getUserMedia } = microphone();
    await inThePackInterview();
    await user().click(mic());

    expect(screen.getByText("Voice needs a one-time download of about 63 MB. It stays in this browser, and your voice never leaves it.")).toBeInTheDocument();
    expect(getUserMedia).not.toHaveBeenCalled();
    await user().click(screen.getByRole("button", { name: "Download and record" }));

    await waitFor(() => expect(mic()).toHaveAccessibleName("Stop recording"));
    expect(screen.getByText("Recording 0:00")).toBeInTheDocument();
    await user().click(mic());

    await waitFor(() => expect(answerBox()).toHaveValue(SPOKEN));
    await waitFor(() => expect(screen.getByRole("status", { name: "Answer" })).toHaveTextContent("Saved"), { timeout: 3000 });
    expect(mic()).toHaveAccessibleName("Record your answer");
  });

  it("records straight away once the model is downloaded", async () => {
    microphone();
    await inThePackInterview(createFakeModelGateway({ transcripts: [SPOKEN], transcriberDownloaded: true }));
    await user().click(mic());

    await waitFor(() => expect(mic()).toHaveAccessibleName("Stop recording"));
    expect(screen.queryByText(/one-time download/)).not.toBeInTheDocument();
  });

  it("adds what was said after what's already typed", async () => {
    microphone();
    await inThePackInterview(createFakeModelGateway({ transcripts: [SPOKEN], transcriberDownloaded: true }));
    await user().type(answerBox(), "The warehouse system went down.");
    await user().click(mic());
    await waitFor(() => expect(mic()).toHaveAccessibleName("Stop recording"));
    await user().click(mic());

    await waitFor(() => expect(answerBox()).toHaveValue(`The warehouse system went down. ${SPOKEN}`));
  });

  it("stops by itself at 3 minutes", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    microphone();
    await inThePackInterview(createFakeModelGateway({ transcripts: [SPOKEN], transcriberDownloaded: true }));
    await user().click(mic());
    await waitFor(() => expect(mic()).toHaveAccessibleName("Stop recording"));

    act(() => void vi.advanceTimersByTime(179_000));
    expect(screen.getByText("Recording 2:59")).toBeInTheDocument();
    act(() => void vi.advanceTimersByTime(1_000));
    await waitFor(() => expect(answerBox()).toHaveValue(SPOKEN));
  });

  it("works without an Access Token", async () => {
    microphone();
    await inThePackInterview(createFakeModelGateway({ transcripts: [SPOKEN], transcriberDownloaded: true }));
    expect(screen.getByRole("button", { name: /^Access/ })).toHaveTextContent(/none/i);

    await user().click(mic());
    await waitFor(() => expect(mic()).toHaveAccessibleName("Stop recording"));
    await user().click(mic());
    await waitFor(() => expect(answerBox()).toHaveValue(SPOKEN));
  });
});

describe("leaving while speaking", () => {
  it("turns the microphone off, and adds what was said to that Question when the card changes", async () => {
    microphone();
    await inThePackInterview(createFakeModelGateway({ transcripts: [SPOKEN], transcriberDownloaded: true }));
    await user().click(mic());
    await waitFor(() => expect(mic()).toHaveAccessibleName("Stop recording"));
    await user().click(screen.getByRole("button", { name: "Next Question" }));

    expect(microphoneOn()).toBe(false);
    await screen.findByRole("article", { name: "Question 2 of 6" });
    await waitFor(() => expect(screen.getByText(/^6 Questions · 1 answered/)).toBeInTheDocument());
    await user().click(screen.getByRole("button", { name: "Previous Question" }));
    expect(await screen.findByDisplayValue(SPOKEN)).toBeInTheDocument();
  });

  it("doesn't start recording if the card changed while the microphone was starting", async () => {
    const { answer } = microphone({ held: true });
    await inThePackInterview(createFakeModelGateway({ transcriberDownloaded: true }));
    await user().click(mic());
    await user().click(screen.getByRole("button", { name: "Next Question" }));
    await act(async () => {
      answer();
      await Promise.resolve(); // let the microphone's answer arrive
    });

    expect(FakeRecorder.started).toBe(0);
    expect(microphoneOn()).toBe(false);
  });
});

describe("the speech model's download", () => {
  it("starts as soon as the Candidate agrees, while they record", async () => {
    microphone();
    const gateway = createFakeModelGateway({ transcripts: [SPOKEN] });
    const prepare = vi.spyOn(gateway, "prepareTranscriber");
    await inThePackInterview(gateway);
    await user().click(mic());
    await user().click(screen.getByRole("button", { name: "Download and record" }));

    await waitFor(() => expect(mic()).toHaveAccessibleName("Stop recording"));
    expect(prepare).toHaveBeenCalled();
  });
});

describe("when voice can't work", () => {
  it("keeps the recording when it can't be turned into text, and tries again", async () => {
    microphone();
    await inThePackInterview(createFakeModelGateway({ transcripts: [new Error("download failed"), SPOKEN], transcriberDownloaded: true }));
    await user().click(mic());
    await waitFor(() => expect(mic()).toHaveAccessibleName("Stop recording"));
    await user().click(mic());

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Couldn't turn that into text.");
    await user().click(within(alert).getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(answerBox()).toHaveValue(SPOKEN));
  });

  it("says so when the browser can't start recording, and doesn't get stuck", async () => {
    microphone({ recorder: "throws" });
    await inThePackInterview(createFakeModelGateway({ transcriberDownloaded: true }));
    await user().click(mic());

    expect(await screen.findByRole("alert")).toHaveTextContent("This browser couldn't start recording.");
    expect(mic()).toBeEnabled();
    expect(microphoneOn()).toBe(false);
  });

  it("says so when the microphone is refused", async () => {
    microphone({ allowed: false });
    await inThePackInterview(createFakeModelGateway({ transcriberDownloaded: true }));
    await user().click(mic());

    expect(await screen.findByRole("alert")).toHaveTextContent("The microphone was blocked. Allow it for this site in your browser's settings, then try again.");
    expect(FakeRecorder.started).toBe(0);
  });

  it("says so when the page isn't secure", async () => {
    microphone({ secure: false });
    await inThePackInterview();

    expect(mic()).toBeDisabled();
    expect(screen.getByText("Recording needs a secure page (https:// or localhost)")).toBeInTheDocument();
  });

  it("says so when the browser can't record", async () => {
    microphone({ recorder: false });
    await inThePackInterview();

    expect(mic()).toBeDisabled();
    expect(screen.getByText("This browser can't record audio")).toBeInTheDocument();
  });

  it("keeps what's typed when the transcription fails, and says so", async () => {
    microphone();
    await inThePackInterview(createFakeModelGateway({ transcripts: [new ModelGatewayError("not_connected")], transcriberDownloaded: true }));
    await user().type(answerBox(), "Typed first.");
    await user().click(mic());
    await waitFor(() => expect(mic()).toHaveAccessibleName("Stop recording"));
    await user().click(mic());

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't turn that into text. Try again, or type your answer.");
    expect(answerBox()).toHaveValue("Typed first.");
  });
});
