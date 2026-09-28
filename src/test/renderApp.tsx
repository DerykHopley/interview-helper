import { render } from "@testing-library/react";
import { App } from "../App";
import type { ModelGateway } from "../model-gateway/ModelGateway";
import { createFakeModelGateway } from "./fakeModelGateway";

/** Renders the whole app as a Candidate sees it, with a fake Model Gateway (and the setup's in-memory IndexedDB). */
export function renderApp({ gateway = createFakeModelGateway() }: { gateway?: ModelGateway } = {}) {
  return render(<App gateway={gateway} />);
}
