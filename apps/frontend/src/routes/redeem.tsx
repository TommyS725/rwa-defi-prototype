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
import { chainConfig, explorerTxUrl } from "@/lib/chains";
import { contracts, USDC_DECIMALS } from "@/lib/contracts";
import { formatTokenAmount, formatUsd18, parseTokenAmount } from "@/lib/format";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useRwaDecimals } from "@/hooks/useTokenDecimals";
import { useContractTransaction } from "@/hooks/useTransaction";

export function RedeemPage() {
  const { address } = useAppKitAccount();
  const account = (address ?? zeroAddress) as Address;
  const tx = useContractTransaction();
  const { decimals: rwaDecimals } = useRwaDecimals("sepolia");
  const [maxRwaIn, setMaxRwaIn] = useState("");
  const [minUsdcOut, setMinUsdcOut] = useState("");
  const debouncedMaxRwaIn = useDebouncedValue(maxRwaIn);
  const maxRwaInUnits = useMemo(() => parseTokenAmount(maxRwaIn, rwaDecimals), [maxRwaIn, rwaDecimals]);
  const previewMaxRwaInUnits = useMemo(
    () => parseTokenAmount(debouncedMaxRwaIn, rwaDecimals),
    [debouncedMaxRwaIn, rwaDecimals],
  );
  const minUsdcOutUnits = useMemo(() => parseTokenAmount(minUsdcOut, USDC_DECIMALS), [minUsdcOut]);
  const preview = useReadContract({
    address: contracts.sepolia.RWAMintControllerVault.address,
    abi: contracts.sepolia.RWAMintControllerVault.abi,
    functionName: "previewRedeem",
    args: [previewMaxRwaInUnits ?? 0n],
    chainId: chainConfig.sepolia.id,
    query: { enabled: previewMaxRwaInUnits !== undefined && previewMaxRwaInUnits > 0n },
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
  const rwaBalance = useReadContract({
    address: contracts.sepolia.RWAToken.address,
    abi: contracts.sepolia.RWAToken.abi,
    functionName: "balanceOf",
    args: [account],
    chainId: chainConfig.sepolia.id,
  });
  const usdcBalance = useReadContract({
    address: contracts.sepolia.MockUSDC.address,
    abi: contracts.sepolia.MockUSDC.abi,
    functionName: "balanceOf",
    args: [account],
    chainId: chainConfig.sepolia.id,
  });
  const rwaRequired = preview.data?.[0];
  const usdcAmount = preview.data?.[1];
  useEffect(() => {
    if (usdcAmount && usdcAmount > 0n) setMinUsdcOut(formatTokenAmount(usdcAmount, USDC_DECIMALS, USDC_DECIMALS));
  }, [usdcAmount]);
  const needsApproval =
    Boolean(address) && rwaRequired !== undefined && rwaRequired > 0n && (allowance.data ?? 0n) < rwaRequired;
  const insufficientLiquidity = usdcAmount !== undefined && (vaultUsdc.data ?? 0n) < usdcAmount;
  async function submit() {
    if (!maxRwaInUnits || maxRwaInUnits <= 0n) return;
    if (needsApproval)
      await tx.writeAndInvalidateQueries({
        address: contracts.sepolia.RWAToken.address,
        abi: contracts.sepolia.RWAToken.abi,
        functionName: "approve",
        args: [contracts.sepolia.RWAMintControllerVault.address, maxRwaInUnits],
        chainId: chainConfig.sepolia.id,
      });
    else if (insufficientLiquidity)
      await tx.writeAndInvalidateQueries({
        address: contracts.sepolia.RWAMintControllerVault.address,
        abi: contracts.sepolia.RWAMintControllerVault.abi,
        functionName: "requestRedeem",
        args: [maxRwaInUnits],
        chainId: chainConfig.sepolia.id,
      });
    else
      await tx.writeAndInvalidateQueries({
        address: contracts.sepolia.RWAMintControllerVault.address,
        abi: contracts.sepolia.RWAMintControllerVault.abi,
        functionName: "redeem",
        args: [maxRwaInUnits, minUsdcOutUnits ?? 0n],
        chainId: chainConfig.sepolia.id,
      });
  }
  const enoughBalance = rwaBalance.data === undefined || rwaRequired === undefined || rwaBalance.data >= rwaRequired;
  const disabled =
    !rwaBalance.data ||
    !maxRwaInUnits ||
    maxRwaInUnits <= 0n ||
    debouncedMaxRwaIn !== maxRwaIn ||
    preview.isLoading ||
    Boolean(preview.error) ||
    !enoughBalance ||
    (!needsApproval && !insufficientLiquidity && (!minUsdcOutUnits || minUsdcOutUnits <= 0n));
  return (
    <div>
      <PageHeader
        title="Redeem mTRWA"
        description="Burn Sepolia mTRWA tokens for MockUSDC when vault liquidity is available, or request issuer processing when it is not."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Redeem for MockUSDC</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="max-rwa">Maximum mTRWA in</FieldLabel>
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
                  placeholder="Prefill by mTRWA in"
                />
              </Field>
              <NetworkAction
                chainId={chainConfig.sepolia.id}
                chainName="Sepolia"
                disabled={disabled}
                pending={tx.isPending}
                onClick={submit}
              >
                {enoughBalance
                  ? needsApproval
                    ? "Approve mTRWA"
                    : insufficientLiquidity
                      ? "Request redemption"
                      : "Redeem"
                  : "Insufficient mTRWA balance"}
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
                label="Your mTRWA balance"
                value={`${formatTokenAmount(rwaBalance.data, rwaDecimals, 2)} mTRWA`}
              />
              <InfoRow
                label="Your mUSDC balance"
                value={`${formatTokenAmount(usdcBalance.data, USDC_DECIMALS, 2)} mUSDC`}
              />
              <InfoRow
                label="Estimated USDC amount"
                value={`${formatTokenAmount(usdcAmount, USDC_DECIMALS, 6)} mUSDC`}
              />
              <InfoRow label="mTRWA required" value={formatTokenAmount(rwaRequired, rwaDecimals, 6)} />
              <InfoRow
                label="Estimated USDC amount"
                value={`${formatTokenAmount(usdcAmount, USDC_DECIMALS, 6)} mUSDC`}
              />
              <InfoRow label="Vault liquidity" value={`${formatTokenAmount(vaultUsdc.data, USDC_DECIMALS, 2)} mUSDC`} />
              <InfoRow label="Current NAV" value={formatUsd18(nav.data, 4)} />
            </CardContent>
          </Card>
          <Alert>
            <AlertTitle>Rounding and liquidity</AlertTitle>
            <AlertDescription>
              The contract burns only the mTRWA required for the rounded USDC payout. If liquidity is insufficient, it
              emits a redemption request instead.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}
