import { useAppKitAccount } from "@reown/appkit/react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { type Address, zeroAddress } from "viem";
import { useReadContract } from "wagmi";
import { InfoRow } from "@/components/InfoRow";
import { NetworkAction } from "@/components/NetworkAction";
import { PageHeader } from "@/components/PageHeader";
import { TxStatus } from "@/components/TxStatus";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { chainConfig, explorerTxUrl } from "@/lib/chains";
import { contracts, USDC_DECIMALS } from "@/lib/contracts";
import { formatTokenAmount, formatUsd18, parseTokenAmount } from "@/lib/format";
import { useRwaDecimals } from "@/hooks/useTokenDecimals";
import { useContractTransaction } from "@/hooks/useTransaction";

export function MintPage() {
  const { address } = useAppKitAccount();
  const account = (address ?? zeroAddress) as Address;
  const queryClient = useQueryClient();
  const tx = useContractTransaction();
  const { decimals: rwaDecimals } = useRwaDecimals("sepolia");
  const [maxUsdcIn, setMaxUsdcIn] = useState("");
  const [minRwaOut, setMinRwaOut] = useState("");
  const maxUsdcInUnits = useMemo(() => parseTokenAmount(maxUsdcIn, USDC_DECIMALS), [maxUsdcIn]);
  const minRwaOutUnits = useMemo(() => parseTokenAmount(minRwaOut, rwaDecimals), [minRwaOut, rwaDecimals]);
  const preview = useReadContract({
    address: contracts.sepolia.RWAMintControllerVault.address,
    abi: contracts.sepolia.RWAMintControllerVault.abi,
    functionName: "previewMintWithUSDC",
    args: [maxUsdcInUnits ?? 0n],
    chainId: chainConfig.sepolia.id,
    query: { enabled: maxUsdcInUnits !== undefined && maxUsdcInUnits > 0n },
  });
  const nav = useReadContract({
    address: contracts.sepolia.RWAMintControllerVault.address,
    abi: contracts.sepolia.RWAMintControllerVault.abi,
    functionName: "navPerTokenUSD18",
    chainId: chainConfig.sepolia.id,
  });
  const allowance = useReadContract({
    address: contracts.sepolia.MockUSDC.address,
    abi: contracts.sepolia.MockUSDC.abi,
    functionName: "allowance",
    args: [account, contracts.sepolia.RWAMintControllerVault.address],
    chainId: chainConfig.sepolia.id,
    query: { enabled: Boolean(address) },
  });
  const [rwaAmount, usdcRequired] = (preview.data ?? [undefined, undefined]) as readonly [
    bigint | undefined,
    bigint | undefined,
  ];
  useEffect(() => {
    if (rwaAmount && rwaAmount > 0n) setMinRwaOut(formatTokenAmount(rwaAmount, rwaDecimals, rwaDecimals));
  }, [rwaAmount, rwaDecimals]);
  const needsApproval =
    Boolean(address) &&
    usdcRequired !== undefined &&
    usdcRequired > 0n &&
    ((allowance.data as bigint | undefined) ?? 0n) < usdcRequired;
  async function submit() {
    if (!maxUsdcInUnits || maxUsdcInUnits <= 0n) return;
    if (needsApproval)
      await tx.writeAsync({
        address: contracts.sepolia.MockUSDC.address,
        abi: contracts.sepolia.MockUSDC.abi,
        functionName: "approve",
        args: [contracts.sepolia.RWAMintControllerVault.address, maxUsdcInUnits],
        chainId: chainConfig.sepolia.id,
      });
    else
      await tx.writeAsync({
        address: contracts.sepolia.RWAMintControllerVault.address,
        abi: contracts.sepolia.RWAMintControllerVault.abi,
        functionName: "mintWithUSDC",
        args: [maxUsdcInUnits, minRwaOutUnits ?? 0n],
        chainId: chainConfig.sepolia.id,
      });
    await queryClient.invalidateQueries();
  }
  const disabled =
    !maxUsdcInUnits ||
    maxUsdcInUnits <= 0n ||
    preview.isLoading ||
    Boolean(preview.error) ||
    (!needsApproval && (!minRwaOutUnits || minRwaOutUnits <= 0n));
  return (
    <div>
      <PageHeader title="Mint RWA" description="Spend MockUSDC on Sepolia to mint reserve-backed RWA tokens." />
      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Mint with MockUSDC</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="max-usdc">Maximum USDC in</FieldLabel>
                <Input
                  id="max-usdc"
                  inputMode="decimal"
                  value={maxUsdcIn}
                  onChange={(event) => setMaxUsdcIn(event.target.value)}
                  placeholder="1000"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="min-rwa">Minimum RWA out</FieldLabel>
                <Input
                  id="min-rwa"
                  inputMode="decimal"
                  value={minRwaOut}
                  onChange={(event) => setMinRwaOut(event.target.value)}
                  placeholder="Prefill by RWA In"
                />
              </Field>
              <NetworkAction
                chainId={chainConfig.sepolia.id}
                chainName="Sepolia"
                disabled={disabled}
                pending={tx.isPending}
                onClick={submit}
              >
                {needsApproval ? "Approve MockUSDC" : "Mint RWA"}
              </NetworkAction>
              <TxStatus
                hash={tx.hash}
                txUrl={tx.hash ? explorerTxUrl("sepolia", tx.hash) : undefined}
                pending={tx.isPending}
                success={tx.isSuccess}
                error={tx.error}
              />
            </FieldGroup>
          </CardContent>
        </Card>
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <InfoRow label="Estimated RWA amount" value={formatTokenAmount(rwaAmount, rwaDecimals, 6)} />
              <InfoRow label="USDC required" value={`${formatTokenAmount(usdcRequired, USDC_DECIMALS, 6)} mUSDC`} />
              <InfoRow label="Current NAV" value={formatUsd18(nav.data as bigint | undefined, 4)} />
              <InfoRow
                label="MockUSDC allowance"
                value={`${formatTokenAmount(allowance.data as bigint | undefined, USDC_DECIMALS, 2)} mUSDC`}
              />
            </CardContent>
          </Card>
          <Alert>
            <AlertTitle>Rounding and change protection</AlertTitle>
            <AlertDescription>
              The contract transfers only the USDC required for the rounded RWA output, not necessarily your full
              maximum input.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}
