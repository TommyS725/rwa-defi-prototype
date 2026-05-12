import { createRootRoute, createRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { AllowancePage } from "@/routes/allowance";
import { BridgePage } from "@/routes/bridge";
import { FaucetPage } from "@/routes/faucet";
import { HomePage } from "@/routes/home";
import { MetadataPage } from "@/routes/metadata";
import { MintPage } from "@/routes/mint";
import { RedeemPage } from "@/routes/redeem";

const rootRoute = createRootRoute({ component: AppShell });
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: HomePage });
const mintRoute = createRoute({ getParentRoute: () => rootRoute, path: "/mint", component: MintPage });
const redeemRoute = createRoute({ getParentRoute: () => rootRoute, path: "/redeem", component: RedeemPage });
const bridgeRoute = createRoute({ getParentRoute: () => rootRoute, path: "/bridge", component: BridgePage });
const allowanceRoute = createRoute({ getParentRoute: () => rootRoute, path: "/allowance", component: AllowancePage });
const faucetRoute = createRoute({ getParentRoute: () => rootRoute, path: "/faucet", component: FaucetPage });
const metadataRoute = createRoute({ getParentRoute: () => rootRoute, path: "/metadata", component: MetadataPage });

export const routeTree = rootRoute.addChildren([
  indexRoute,
  mintRoute,
  redeemRoute,
  bridgeRoute,
  allowanceRoute,
  faucetRoute,
  metadataRoute,
]);
