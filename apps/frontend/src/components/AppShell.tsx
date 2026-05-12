import { useAppKit, useAppKitAccount, useAppKitNetwork, AppKitAccountButton } from "@reown/appkit/react";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Coins, Droplets, Home, Info, Repeat, Send, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useContractEventRefresh } from "@/hooks/useContractEventRefresh";
import { chainConfig } from "@/lib/chains";
import { shortenAddress } from "@/lib/format";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Home", icon: Home },
  { to: "/mint", label: "Mint", icon: Coins },
  { to: "/redeem", label: "Redeem", icon: Repeat },
  { to: "/bridge", label: "Bridge", icon: Send },
  { to: "/allowance", label: "Allowance", icon: ShieldCheck },
  { to: "/faucet", label: "Faucet", icon: Droplets },
  { to: "/metadata", label: "Metadata", icon: Info },
] as const;

export function AppShell() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  useContractEventRefresh();
  const activeChain = Object.values(chainConfig).find((chain) => chain.id === chainId);
  const chainLabel = chainId ? `${activeChain?.name ?? "Unsupported"} (${chainId})` : "No chain";
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">RWA prototype</p>
              <h1 className="text-xl font-semibold">Reserve-backed token demo</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="h-10 min-w-[160px] justify-center px-3 text-sm" variant="outline">
                {chainLabel}
              </Badge>

              {
                isConnected ? <AppKitAccountButton /> :
                  <Button className="min-w-[160px]" variant="outline" onClick={() => void open()}>
                    Connect wallet
                  </Button>
              }
              <ThemeToggle />
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto">
            {nav.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium no-underline transition-colors [&_[data-icon]]:size-4",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon data-icon="inline-start" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
