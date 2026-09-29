import { render } from "@testing-library/react";
import { App } from "../App";
import { dropAccessTokenFromMemory } from "../access/keptAccessToken";
import { createFakeModelGateway, type FakeModelGateway } from "./fakeModelGateway";

/** Renders the whole app as a Candidate sees it on a fresh page load, with a fake Model Gateway (and the setup's
 * in-memory IndexedDB). Nothing is held in memory from a previous render, just as after a reload. */
export function renderApp({ gateway = createFakeModelGateway() }: { gateway?: FakeModelGateway } = {}) {
  dropAccessTokenFromMemory();
  return render(
    <App
      createGateway={(getAccessToken) => {
        gateway.connect(getAccessToken);
        return gateway;
      }}
    />,
  );
}
