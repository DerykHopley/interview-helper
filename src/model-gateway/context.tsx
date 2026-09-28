import { createContext, use, type ReactNode } from "react";
import type { ModelGateway } from "./ModelGateway";

const ModelGatewayContext = createContext<ModelGateway | null>(null);

export function ModelGatewayProvider({ gateway, children }: { gateway: ModelGateway; children: ReactNode }) {
  return <ModelGatewayContext value={gateway}>{children}</ModelGatewayContext>;
}

export function useModelGateway(): ModelGateway {
  const gateway = use(ModelGatewayContext);
  if (!gateway) throw new Error("useModelGateway must be used inside a ModelGatewayProvider");
  return gateway;
}
