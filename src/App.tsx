import { Access } from "./access/Access";
import { ModelGatewayProvider } from "./model-gateway/context";
import type { ModelGateway } from "./model-gateway/ModelGateway";

export function App({ gateway }: { gateway: ModelGateway }) {
  return (
    <ModelGatewayProvider gateway={gateway}>
      <h1>Interview Helper</h1>
      <Access />
    </ModelGatewayProvider>
  );
}
