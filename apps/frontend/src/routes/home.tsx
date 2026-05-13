import { useAppKitAccount } from "@reown/appkit/react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { type Address, zeroAddress } from "viem";
import { useReadContracts } from "wagmi";
import { NetworkAction } from "@/components/NetworkAction";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { TxStatus } from "@/components/TxStatus";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useContractTransaction } from "@/hooks/useTransaction";
import { chainConfig, explorerTxUrl } from "@/lib/chains";
import { contracts, USDC_DECIMALS } from "@/lib/contracts";
import { formatIntegerString, formatTimestamp, formatTokenAmount, formatUsd18 } from "@/lib/format";
import { fetchReserveReport, oracleAdminUrl } from "@/lib/oracle";

type SuccessfulRead = { status: "success"; result: unknown };

function isSuccessfulRead(value: unknown): value is SuccessfulRead {
  return (
    typeof value === "object" && value !== null && "status" in value && value.status === "success" && "result" in value
  );
}

function readResult(data: readonly unknown[] | undefined, index: number): unknown {
  const item = data?.[index];
  return isSuccessfulRead(item) ? item.result : undefined;
}

function reserveRawField(data: unknown, key: string): unknown {
  if (!data) return undefined;
  if (Array.isArray(data)) {
    const index: Record<string, number> = {
      adjustedOffchainReserveUSD: 0,
      reserveValid: 1,
      updatedAt: 2,
      attestationHash: 3,
    };
    return data[index[key]];
  }
  if (typeof data === "object") {
    return Object.entries(data).find(([entryKey]) => entryKey === key)?.[1];
  }
  return undefined;
}

function bigintResult(data: readonly unknown[] | undefined, index: number): bigint | undefined {
  const value = readResult(data, index);
  return typeof value === "bigint" ? value : undefined;
}

function reserveField(data: unknown, key: string): bigint | undefined {
  const value = reserveRawField(data, key);
  return typeof value === "bigint" ? value : undefined;
}

function reserveStringField(data: unknown, key: string): string | undefined {
  const value = reserveRawField(data, key);
  return typeof value === "string" ? value : undefined;
}

function normalizeHash(hash: string | undefined): string | undefined {
  const normalized = hash?.trim().toLowerCase();
  return normalized ? normalized : undefined;
}

function shortHash(hash: string | undefined): string {
  return hash ? `${hash.slice(0, 10)}...${hash.slice(-8)}` : "Unavailable";
}

export function HomePage() {
  const { address } = useAppKitAccount();
  const account = (address ?? zeroAddress) as Address;
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
  const readData = reads.data;
  const latestReserve = readResult(readData, 0);
  const adjustedReserveUsd18 = reserveField(latestReserve, "adjustedOffchainReserveUSD");
  const vaultUsdc = bigintResult(readData, 1);
  const navPerToken = bigintResult(readData, 2);
  const sepoliaSupply = bigintResult(readData, 3);
  const amoySupply = bigintResult(readData, 4);
  const sepoliaUsdcBalance = bigintResult(readData, 5);
  const sepoliaTokenBalance = bigintResult(readData, 6);
  const amoyTokenBalance = bigintResult(readData, 7);
  const apiAttestationHash = normalizeHash(reserveReport.data?.attestationHash);
  const chainAttestationHash = normalizeHash(reserveStringField(latestReserve, "attestationHash"));
  const canCompareAttestationHashes = Boolean(apiAttestationHash && chainAttestationHash);
  const reserveUpdateAvailable = canCompareAttestationHashes && apiAttestationHash !== chainAttestationHash;
  const totalOnChainReserveUsd18 =
    adjustedReserveUsd18 !== undefined && vaultUsdc !== undefined
      ? adjustedReserveUsd18 + vaultUsdc * 10n ** 12n
      : undefined;

  async function requestReserveUpdate() {
    await tx.writeAndInvalidateQueries({
      address: contracts.sepolia.ReserveOracle.address,
      abi: contracts.sepolia.ReserveOracle.abi,
      functionName: "requestReserveUpdate",
      chainId: contracts.sepolia.ReserveOracle.chainId,
    });
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
          detail={`Updated ${formatTimestamp(reserveField(latestReserve, "updatedAt"))}`}
          loading={reads.isLoading}
        />
        <StatCard
          title="Vault USDC balance"
          value={`${formatTokenAmount(vaultUsdc, USDC_DECIMALS, 2)} mUSDC`}
          detail="Held by RWAMintControllerVault"
          loading={reads.isLoading}
        />
        <StatCard
          title="Current NAV"
          value={formatUsd18(navPerToken, 4)}
          detail={[
            "USD per mTRWA token.",
            `Total reserve (off-chain adjusted + on-chain USDC): ${formatUsd18(totalOnChainReserveUsd18)}`,
          ]}
          loading={reads.isLoading}
        />
        <StatCard
          title="Sepolia mTRWA supply"
          value={formatTokenAmount(sepoliaSupply, 18, 4)}
          detail="Canonical issuing chain"
          loading={reads.isLoading}
        />
        <StatCard
          title="Amoy mTRWA supply"
          value={formatTokenAmount(amoySupply, 18, 4)}
          detail="Destination-chain representation"
          loading={reads.isLoading}
        />
        <StatCard
          title="Your Sepolia mTRWA balance"
          value={formatTokenAmount(sepoliaTokenBalance, 18, 4)}
          detail={address ? "Connected wallet" : "Connect wallet to read your balance"}
          loading={reads.isLoading}
        />
        <StatCard
          title="Your Amoy mTRWA balance"
          value={formatTokenAmount(amoyTokenBalance, 18, 4)}
          detail={address ? "Connected wallet" : "Connect wallet to read your balance"}
          loading={reads.isLoading}
        />
        <StatCard
          title="Your Sepolia MockUSDC balance"
          value={`${formatTokenAmount(sepoliaUsdcBalance, USDC_DECIMALS, 2)} mUSDC`}
          detail={address ? "Connected wallet" : "Connect wallet to read your balance"}
          loading={reads.isLoading}
        />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>Reserve update workflow</CardTitle>
              {canCompareAttestationHashes ? (
                <Badge variant={reserveUpdateAvailable ? "default" : "secondary"}>
                  {reserveUpdateAvailable ? "On-chain update available" : "Oracle is current"}
                </Badge>
              ) : null}
            </div>
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
                <a href={oracleAdminUrl} target="_blank" rel="noreferrer">
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
            {canCompareAttestationHashes ? (
              <Alert className={reserveUpdateAvailable ? "border-primary/40" : "border-emerald-500/40"}>
                <AlertTitle>
                  {reserveUpdateAvailable
                    ? "Off-chain reserve differs from on-chain oracle"
                    : "Attestation hashes match"}
                </AlertTitle>
                <AlertDescription>
                  API hash: {shortHash(apiAttestationHash)}. Chain hash: {shortHash(chainAttestationHash)}.{" "}
                  {reserveUpdateAvailable
                    ? "The on-chain update button can sync the latest worker API reserve report."
                    : "No on-chain reserve update is needed for the current worker API report."}
                </AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <AlertTitle>Attestation comparison unavailable</AlertTitle>
                <AlertDescription>
                  Load both the worker API report and on-chain reserve data to see whether an update is available.
                </AlertDescription>
              </Alert>
            )}
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
            NAV from total backing over mTRWA supply.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
