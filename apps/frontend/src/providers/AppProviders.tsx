import { createAppKit } from "@reown/appkit/react";
import type { AppKitNetwork } from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { WagmiProvider } from "wagmi";
import { chainConfig } from "@/lib/chains";
import { env } from "@/lib/env";
import { queryClient } from "@/lib/query";
import { ThemeProvider } from "@/providers/ThemeProvider";

const networks = [chainConfig.sepolia, chainConfig.amoy] as [AppKitNetwork, ...AppKitNetwork[]];
const wagmiAdapter = new WagmiAdapter({ networks, projectId: env.reownProjectId, ssr: false });

createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId: env.reownProjectId,
  metadata: {
    name: "mTRWA Demo",
    description: "Reserve-backed mTRWA demo for oracle updates, minting, redeeming, and CCIP transfers.",
    url: window.location.origin,
    icons: [`${window.location.origin}/favicon.svg`],
  },
  enableNetworkSwitch: true,
  features: { swaps: false, onramp: false, socials: false, email: false },
});

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>{children}</ThemeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
