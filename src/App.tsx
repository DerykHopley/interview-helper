import { useState } from "react";
import { VaultGate } from "./access/VaultGate";
import { accessTokenInUse } from "./access/keptAccessToken";
import { ModelGatewayProvider } from "./model-gateway/context";
import type { ModelGateway } from "./model-gateway/ModelGateway";

/** Makes the Model Gateway, given how it finds the Access Token to send: the Worker's in the browser, a fake in tests. */
export type CreateGateway = (getAccessToken: () => string | null) => ModelGateway;

export function App({ createGateway }: { createGateway: CreateGateway }) {
  const [gateway] = useState(() => createGateway(accessTokenInUse));
  return (
    <ModelGatewayProvider gateway={gateway}>
      <VaultGate />
    </ModelGatewayProvider>
  );
}
