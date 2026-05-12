import { useAppKitAccount } from "@reown/appkit/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { type Address, zeroAddress } from "viem";
import { useReadContracts } from "wagmi";
import { ExternalLink } from "@/components/ExternalLink";
import { NetworkAction } from "@/components/NetworkAction";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { TxStatus } from "@/components/TxStatus";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { chainConfig, explorerTxUrl } from "@/lib/chains";
import { contracts, USDC_DECIMALS } from "@/lib/contracts";
import { env } from "@/lib/env";
import { formatIntegerString, formatTimestamp, formatTokenAmount, formatUsd18 } from "@/lib/format";
import { fetchReserveReport } from "@/lib/oracle";
import { useContractTransaction } from "@/hooks/useTransaction";

function reserveField(data: unknown, key: string): bigint | undefined {
  if (!data) return undefined;
  if (Array.isArray(data)) {
    const index: Record<string, number> = {
      adjustedOffchainReserveUSD: 0,
      reserveValid: 1,
      updatedAt: 2,
      attestationHash: 3,
    };
    return data[index[key]] as bigint | undefined;
  }
  return (data as Record<string, bigint | undefined>)[key];
}

export function HomePage() {
  const { address } = useAppKitAccount();
  const account = (address ?? zeroAddress) as Address;
  const queryClient = useQueryClient();
  const tx = useContractTransaction();
  const reserveReport = useQuery({ queryKey: ["reserve-report"], queryFn: fetchReserveReport });
  const reads = useReadContracts({
    contracts: [
      { ...contracts.sepolia.ReserveOracle, functionName: "getLatestReserveData" },
      { ...contracts.sepolia.RWAMintControllerVault, functionName: "vaultUSDCBalance" },
      { ...contracts.sepolia.RWAMintControllerVault, functionName: "navPerTokenUSD18" },
      { ...contracts.sepolia.RWAToken, functionName: "totalSupply" },
      { ...contracts.amoy.RWAToken, functionName: "totalSupply" },
      { ...contracts.sepolia.MockUSDC, functionName: "balanceOf", args: [account] },
      { ...contracts.sepolia.RWAToken, functionName: "balanceOf", args: [account] },
      { ...contracts.amoy.RWAToken, functionName: "balanceOf", args: [account] },
    ],
    query: { refetchInterval: 20_000 },
  });
  const data = reads.data?.map((item) => (item.status === "success" ? item.result : undefined));
  const adjustedReserveUsd18 = reserveField(data?.[0], "adjustedOffchainReserveUSD");
  const vaultUsdc = data?.[1] as bigint | undefined;
  const totalOnChainReserveUsd18 =
    adjustedReserveUsd18 !== undefined && vaultUsdc !== undefined
      ? adjustedReserveUsd18 + vaultUsdc * 10n ** 12n
      : undefined;

  async function requestReserveUpdate() {
    await tx.writeAsync({
      address: contracts.sepolia.ReserveOracle.address,
      abi: contracts.sepolia.ReserveOracle.abi,
      functionName: "requestReserveUpdate",
      chainId: contracts.sepolia.ReserveOracle.chainId,
    });
    await queryClient.invalidateQueries();
  }

  return (
    <div>
      <PageHeader
        title="RWA Reserve Dashboard"
        description="The worker API reserve report with on-chain oracle, vault liquidity, NAV, supply, and wallet balances."
      />

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Off-chain adjusted reserve"
          value={`$${formatIntegerString(reserveReport.data?.adjustedOffchainReserveUSD)}`}
          detail={
            reserveReport.data
              ? `Report ${reserveReport.data.reportId} - ${formatTimestamp(reserveReport.data.updatedAt)}`
              : undefined
          }
          loading={reserveReport.isLoading}
        />
        <StatCard
          title="On-chain adjusted reserve"
          value={formatUsd18(adjustedReserveUsd18)}
          detail={`Updated ${formatTimestamp(reserveField(data?.[0], "updatedAt"))}`}
          loading={reads.isLoading}
        />
        <StatCard
          title="Vault USDC balance"
          value={`${formatTokenAmount(data?.[1] as bigint | undefined, USDC_DECIMALS, 2)} mUSDC`}
          detail="Held by RWAMintControllerVault"
          loading={reads.isLoading}
        />
        <StatCard
          title="Current NAV"
          value={formatUsd18(data?.[2] as bigint | undefined, 4)}
          detail={['USD per RWA token.', `Total reserve (off-chain adjusted + on-chain USDC): ${formatUsd18(totalOnChainReserveUsd18)}`]}
          loading={reads.isLoading}
        />
        <StatCard
          title="Sepolia RWA supply"
          value={formatTokenAmount(data?.[3] as bigint | undefined, 18, 4)}
          detail="Canonical issuing chain"
          loading={reads.isLoading}
        />
        <StatCard
          title="Amoy RWA supply"
          value={formatTokenAmount(data?.[4] as bigint | undefined, 18, 4)}
          detail="Destination-chain representation"
          loading={reads.isLoading}
        />
        <StatCard
          title="Your Sepolia RWA balance"
          value={formatTokenAmount(data?.[6] as bigint | undefined, 18, 4)}
          detail={address ? "Connected wallet" : "Connect wallet to read your balance"}
          loading={reads.isLoading}
        />
        <StatCard
          title="Your Amoy RWA balance"
          value={formatTokenAmount(data?.[7] as bigint | undefined, 18, 4)}
          detail={address ? "Connected wallet" : "Connect wallet to read your balance"}
          loading={reads.isLoading}
        />
        <StatCard
          title="Your Sepolia MockUSDC balance"
          value={`${formatTokenAmount(data?.[5] as bigint | undefined, USDC_DECIMALS, 2)} mUSDC`}
          detail={address ? "Connected wallet" : "Connect wallet to read your balance"}
          loading={reads.isLoading}
        />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Reserve update workflow</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
              {[
                "Open the worker admin page and modify the off-chain reserve report.",
                "Refresh the API card to confirm the updated off-chain value.",
                "Request an on-chain update through ReserveOracle on Sepolia.",
              ].map((text, index) => (
                <div className="rounded-md border p-3" key={text}>
                  <Badge variant="secondary">{index + 1}</Badge>
                  <p className="mt-2">{text}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <a href={env.oracleAdminUrl} target="_blank" rel="noreferrer">
                  Open API admin
                </a>
              </Button>
              <Button variant="secondary" onClick={() => void reserveReport.refetch()}>
                <RefreshCw data-icon="inline-start" />
                Refresh API data
              </Button>
              <NetworkAction
                chainId={chainConfig.sepolia.id}
                chainName="Sepolia"
                pending={tx.isPending}
                onClick={requestReserveUpdate}
              >
                Request on-chain update
              </NetworkAction>
            </div>
            <TxStatus
              hash={tx.hash}
              txUrl={tx.hash ? explorerTxUrl("sepolia", tx.hash) : undefined}
              pending={tx.isPending}
              success={tx.isSuccess}
              error={tx.error}
            />
          </CardContent>
        </Card>
        <Alert>
          <AlertTitle>Demo accounting model</AlertTitle>
          <AlertDescription>
            Sepolia is the issuing chain. The vault adds on-chain MockUSDC liquidity to oracle reserve data and computes
            NAV from total backing over RWA supply.
          </AlertDescription>
        </Alert>
      </div>
      <div className="flex flex-wrap gap-4">
        <ExternalLink href={env.oracleApiUrl}>Oracle API endpoint</ExternalLink>
        <ExternalLink href={env.oracleAdminUrl}>Worker admin page</ExternalLink>
      </div>
    </div>
  );
}
