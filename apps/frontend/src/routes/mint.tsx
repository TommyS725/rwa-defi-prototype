import { useAppKitAccount } from "@reown/appkit/react";
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
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useRwaDecimals } from "@/hooks/useTokenDecimals";
import { useContractTransaction } from "@/hooks/useTransaction";
import { chainConfig, explorerTxUrl } from "@/lib/chains";
import { contracts, USDC_DECIMALS } from "@/lib/contracts";
import { formatTokenAmount, formatUsd18, parseTokenAmount } from "@/lib/format";

export function MintPage() {
  const { address } = useAppKitAccount();
  const account = (address ?? zeroAddress) as Address;
  const tx = useContractTransaction();
  const { decimals: rwaDecimals } = useRwaDecimals("sepolia");
  const [maxUsdcIn, setMaxUsdcIn] = useState("");
  const [minRwaOut, setMinRwaOut] = useState("");
  const debouncedMaxUsdcIn = useDebouncedValue(maxUsdcIn);
  const maxUsdcInUnits = useMemo(() => parseTokenAmount(maxUsdcIn, USDC_DECIMALS), [maxUsdcIn]);
  const previewMaxUsdcInUnits = useMemo(
    () => parseTokenAmount(debouncedMaxUsdcIn, USDC_DECIMALS),
    [debouncedMaxUsdcIn],
  );
  const minRwaOutUnits = useMemo(() => parseTokenAmount(minRwaOut, rwaDecimals), [minRwaOut, rwaDecimals]);
  const preview = useReadContract({
    address: contracts.sepolia.RWAMintControllerVault.address,
    abi: contracts.sepolia.RWAMintControllerVault.abi,
    functionName: "previewMintWithUSDC",
    args: [previewMaxUsdcInUnits ?? 0n],
    chainId: chainConfig.sepolia.id,
    query: { enabled: previewMaxUsdcInUnits !== undefined && previewMaxUsdcInUnits > 0n },
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
  const usdcBalance = useReadContract({
    address: contracts.sepolia.MockUSDC.address,
    abi: contracts.sepolia.MockUSDC.abi,
    functionName: "balanceOf",
    args: [account],
    chainId: chainConfig.sepolia.id,
  });
  const rwaBalance = useReadContract({
    address: contracts.sepolia.RWAToken.address,
    abi: contracts.sepolia.RWAToken.abi,
    functionName: "balanceOf",
    args: [account],
    chainId: chainConfig.sepolia.id,
  });
  const rwaAmount = preview.data?.[0];
  const usdcRequired = preview.data?.[1];
  useEffect(() => {
    if (rwaAmount && rwaAmount > 0n) setMinRwaOut(formatTokenAmount(rwaAmount, rwaDecimals, rwaDecimals));
  }, [rwaAmount, rwaDecimals]);
  const needsApproval =
    Boolean(address) && usdcRequired !== undefined && usdcRequired > 0n && (allowance.data ?? 0n) < usdcRequired;
  async function submit() {
    if (!maxUsdcInUnits || maxUsdcInUnits <= 0n) return;
    if (needsApproval)
      await tx.writeAndInvalidateQueries({
        address: contracts.sepolia.MockUSDC.address,
        abi: contracts.sepolia.MockUSDC.abi,
        functionName: "approve",
        args: [contracts.sepolia.RWAMintControllerVault.address, maxUsdcInUnits],
        chainId: chainConfig.sepolia.id,
      });
    else
      await tx.writeAndInvalidateQueries({
        address: contracts.sepolia.RWAMintControllerVault.address,
        abi: contracts.sepolia.RWAMintControllerVault.abi,
        functionName: "mintWithUSDC",
        args: [maxUsdcInUnits, minRwaOutUnits ?? 0n],
        chainId: chainConfig.sepolia.id,
      });
  }
  const enoughBalance =
    usdcBalance.data === undefined || maxUsdcInUnits === undefined || usdcBalance.data >= maxUsdcInUnits;
  const disabled =
    !usdcBalance.data ||
    !maxUsdcInUnits ||
    maxUsdcInUnits <= 0n ||
    debouncedMaxUsdcIn !== maxUsdcIn ||
    preview.isLoading ||
    Boolean(preview.error) ||
    !enoughBalance ||
    (!needsApproval && (!minRwaOutUnits || minRwaOutUnits <= 0n));
  return (
    <div>
      <PageHeader title="Mint mTRWA" description="Spend MockUSDC on Sepolia to mint reserve-backed mTRWA tokens." />
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
                <FieldLabel htmlFor="min-rwa">Minimum mTRWA out</FieldLabel>
                <Input
                  id="min-rwa"
                  inputMode="decimal"
                  value={minRwaOut}
                  onChange={(event) => setMinRwaOut(event.target.value)}
                  placeholder="Prefill by mTRWA out"
                />
              </Field>
              <NetworkAction
                chainId={chainConfig.sepolia.id}
                chainName="Sepolia"
                disabled={disabled}
                pending={tx.isPending}
                onClick={submit}
              >
                {enoughBalance ? (needsApproval ? "Approve MockUSDC" : "Mint mTRWA") : "Insufficient mUSDC balance"}
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
              <InfoRow
                label="Your mUSDC balance"
                value={`${formatTokenAmount(usdcBalance.data, USDC_DECIMALS, 2)} mUSDC`}
              />
              <InfoRow
                label="Your mTRWA balance"
                value={`${formatTokenAmount(rwaBalance.data, rwaDecimals, 2)} mTRWA`}
              />
              <InfoRow label="Estimated mTRWA amount" value={formatTokenAmount(rwaAmount, rwaDecimals, 6)} />
              <InfoRow label="USDC required" value={`${formatTokenAmount(usdcRequired, USDC_DECIMALS, 6)} mUSDC`} />
              <InfoRow label="Current NAV" value={formatUsd18(nav.data, 4)} />
              <InfoRow
                label="MockUSDC allowance"
                value={`${formatTokenAmount(allowance.data, USDC_DECIMALS, 2)} mUSDC`}
              />
            </CardContent>
          </Card>
          <Alert>
            <AlertTitle>Rounding and change protection</AlertTitle>
            <AlertDescription>
              The contract transfers only the USDC required for the rounded mTRWA output, not necessarily your full
              maximum input.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}
