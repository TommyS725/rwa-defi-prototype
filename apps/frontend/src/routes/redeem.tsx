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

export function RedeemPage() {
  const { address } = useAppKitAccount();
  const account = (address ?? zeroAddress) as Address;
  const queryClient = useQueryClient();
  const tx = useContractTransaction();
  const { decimals: rwaDecimals } = useRwaDecimals("sepolia");
  const [maxRwaIn, setMaxRwaIn] = useState("");
  const [minUsdcOut, setMinUsdcOut] = useState("");
  const maxRwaInUnits = useMemo(() => parseTokenAmount(maxRwaIn, rwaDecimals), [maxRwaIn, rwaDecimals]);
  const minUsdcOutUnits = useMemo(() => parseTokenAmount(minUsdcOut, USDC_DECIMALS), [minUsdcOut]);
  const preview = useReadContract({
    address: contracts.sepolia.RWAMintControllerVault.address,
    abi: contracts.sepolia.RWAMintControllerVault.abi,
    functionName: "previewRedeem",
    args: [maxRwaInUnits ?? 0n],
    chainId: chainConfig.sepolia.id,
    query: { enabled: maxRwaInUnits !== undefined && maxRwaInUnits > 0n },
  });
  const nav = useReadContract({
    address: contracts.sepolia.RWAMintControllerVault.address,
    abi: contracts.sepolia.RWAMintControllerVault.abi,
    functionName: "navPerTokenUSD18",
    chainId: chainConfig.sepolia.id,
  });
  const vaultUsdc = useReadContract({
    address: contracts.sepolia.RWAMintControllerVault.address,
    abi: contracts.sepolia.RWAMintControllerVault.abi,
    functionName: "vaultUSDCBalance",
    chainId: chainConfig.sepolia.id,
  });
  const allowance = useReadContract({
    address: contracts.sepolia.RWAToken.address,
    abi: contracts.sepolia.RWAToken.abi,
    functionName: "allowance",
    args: [account, contracts.sepolia.RWAMintControllerVault.address],
    chainId: chainConfig.sepolia.id,
    query: { enabled: Boolean(address) },
  });
  const [rwaRequired, usdcAmount] = (preview.data ?? [undefined, undefined]) as readonly [
    bigint | undefined,
    bigint | undefined,
  ];
  useEffect(() => {
    if (usdcAmount && usdcAmount > 0n) setMinUsdcOut(formatTokenAmount(usdcAmount, USDC_DECIMALS, USDC_DECIMALS));
  }, [usdcAmount]);
  const needsApproval =
    Boolean(address) &&
    rwaRequired !== undefined &&
    rwaRequired > 0n &&
    ((allowance.data as bigint | undefined) ?? 0n) < rwaRequired;
  const insufficientLiquidity = usdcAmount !== undefined && ((vaultUsdc.data as bigint | undefined) ?? 0n) < usdcAmount;
  async function submit() {
    if (!maxRwaInUnits || maxRwaInUnits <= 0n) return;
    if (needsApproval)
      await tx.writeAsync({
        address: contracts.sepolia.RWAToken.address,
        abi: contracts.sepolia.RWAToken.abi,
        functionName: "approve",
        args: [contracts.sepolia.RWAMintControllerVault.address, maxRwaInUnits],
        chainId: chainConfig.sepolia.id,
      });
    else if (insufficientLiquidity)
      await tx.writeAsync({
        address: contracts.sepolia.RWAMintControllerVault.address,
        abi: contracts.sepolia.RWAMintControllerVault.abi,
        functionName: "requestRedeem",
        args: [maxRwaInUnits],
        chainId: chainConfig.sepolia.id,
      });
    else
      await tx.writeAsync({
        address: contracts.sepolia.RWAMintControllerVault.address,
        abi: contracts.sepolia.RWAMintControllerVault.abi,
        functionName: "redeem",
        args: [maxRwaInUnits, minUsdcOutUnits ?? 0n],
        chainId: chainConfig.sepolia.id,
      });
    await queryClient.invalidateQueries();
  }
  const disabled =
    !maxRwaInUnits ||
    maxRwaInUnits <= 0n ||
    preview.isLoading ||
    Boolean(preview.error) ||
    (!needsApproval && !insufficientLiquidity && (!minUsdcOutUnits || minUsdcOutUnits <= 0n));
  return (
    <div>
      <PageHeader
        title="Redeem RWA"
        description="Burn Sepolia RWA tokens for MockUSDC when vault liquidity is available, or request issuer processing when it is not."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Redeem for MockUSDC</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="max-rwa">Maximum RWA in</FieldLabel>
                <Input
                  id="max-rwa"
                  inputMode="decimal"
                  value={maxRwaIn}
                  onChange={(event) => setMaxRwaIn(event.target.value)}
                  placeholder="10"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="min-usdc">Minimum USDC out</FieldLabel>
                <Input
                  id="min-usdc"
                  inputMode="decimal"
                  value={minUsdcOut}
                  onChange={(event) => setMinUsdcOut(event.target.value)}
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
                {needsApproval ? "Approve RWA" : insufficientLiquidity ? "Request redemption" : "Redeem"}
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
              <InfoRow label="RWA required" value={formatTokenAmount(rwaRequired, rwaDecimals, 6)} />
              <InfoRow label="USDC amount" value={`${formatTokenAmount(usdcAmount, USDC_DECIMALS, 6)} mUSDC`} />
              <InfoRow
                label="Vault liquidity"
                value={`${formatTokenAmount(vaultUsdc.data as bigint | undefined, USDC_DECIMALS, 2)} mUSDC`}
              />
              <InfoRow label="Current NAV" value={formatUsd18(nav.data as bigint | undefined, 4)} />
            </CardContent>
          </Card>
          <Alert>
            <AlertTitle>Rounding and liquidity</AlertTitle>
            <AlertDescription>
              The contract burns only the RWA required for the rounded USDC payout. If liquidity is insufficient, it
              emits a redemption request instead.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}
