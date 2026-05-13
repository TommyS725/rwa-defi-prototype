import { useAppKitAccount } from "@reown/appkit/react";
import { ArrowLeftRight } from "lucide-react";
import { useMemo, useState } from "react";
import { type Address, decodeEventLog, zeroAddress } from "viem";
import { useReadContract } from "wagmi";
import { InfoRow } from "@/components/InfoRow";
import { NetworkAction } from "@/components/NetworkAction";
import { PageHeader } from "@/components/PageHeader";
import { TxStatus } from "@/components/TxStatus";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useRwaDecimals } from "@/hooks/useTokenDecimals";
import { useContractTransaction } from "@/hooks/useTransaction";
import { type ChainKey, ccipMessageUrl, chainConfig, explorerTxUrl } from "@/lib/chains";
import { contracts, erc20Abi } from "@/lib/contracts";
import { formatTokenAmount, parseTokenAmount } from "@/lib/format";

const directions: Array<{ source: ChainKey; destination: ChainKey }> = [
  { source: "sepolia", destination: "amoy" },
  { source: "amoy", destination: "sepolia" },
];

export function BridgePage() {
  const { address } = useAppKitAccount();
  const account = (address ?? zeroAddress) as Address;
  const tx = useContractTransaction();
  const fundTx = useContractTransaction();
  const [directionIndex, setDirectionIndex] = useState(0);
  const [amount, setAmount] = useState("");
  const [linkFundAmount, setLinkFundAmount] = useState("");
  const debouncedAmount = useDebouncedValue(amount);
  const direction = directions[directionIndex];
  const { source, destination } = direction;
  const { decimals } = useRwaDecimals(source);
  const amountUnits = useMemo(() => parseTokenAmount(amount, decimals), [amount, decimals]);
  const sponsorFeeAmountUnits = useMemo(() => parseTokenAmount(debouncedAmount, decimals), [debouncedAmount, decimals]);
  const sepoliaBalance = useReadContract({
    address: contracts.sepolia.RWAToken.address,
    abi: contracts.sepolia.RWAToken.abi,
    functionName: "balanceOf",
    args: [account],
    chainId: chainConfig.sepolia.id,
    query: { enabled: Boolean(address) },
  });
  const amoyBalance = useReadContract({
    address: contracts.amoy.RWAToken.address,
    abi: contracts.amoy.RWAToken.abi,
    functionName: "balanceOf",
    args: [account],
    chainId: chainConfig.amoy.id,
    query: { enabled: Boolean(address) },
  });
  const allowance = useReadContract({
    address: contracts[source].RWAToken.address,
    abi: contracts[source].RWAToken.abi,
    functionName: "allowance",
    args: [account, contracts[source].RWATokenBridge.address],
    chainId: chainConfig[source].id,
    query: { enabled: Boolean(address) },
  });
  const linkToken = useReadContract({
    address: contracts[source].RWATokenBridge.address,
    abi: contracts[source].RWATokenBridge.abi,
    functionName: "linkToken",
    chainId: chainConfig[source].id,
  });
  const linkAddress = linkToken.data;
  const linkDecimals = useReadContract({
    address: linkAddress,
    abi: erc20Abi,
    functionName: "decimals",
    chainId: chainConfig[source].id,
    query: { enabled: Boolean(linkAddress) },
  });
  const linkSymbol = useReadContract({
    address: linkAddress,
    abi: erc20Abi,
    functionName: "symbol",
    chainId: chainConfig[source].id,
    query: { enabled: Boolean(linkAddress) },
  });
  const linkBalance = useReadContract({
    address: linkAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [contracts[source].RWATokenBridge.address],
    chainId: chainConfig[source].id,
    query: { enabled: Boolean(linkAddress) },
  });
  const sponsorFee = useReadContract({
    address: contracts[source].RWATokenBridge.address,
    abi: contracts[source].RWATokenBridge.abi,
    functionName: "getFeePayLINK",
    args: [chainConfig[destination].ccipSelector, account, sponsorFeeAmountUnits ?? 0n],
    chainId: chainConfig[source].id,
    query: { enabled: Boolean(address && sponsorFeeAmountUnits && sponsorFeeAmountUnits > 0n) },
  });
  const needsApproval =
    Boolean(address) && amountUnits !== undefined && amountUnits > 0n && (allowance.data ?? 0n) < amountUnits;
  const resolvedLinkDecimals = Number(linkDecimals.data ?? 18);
  const linkBalanceValue = linkBalance.data;
  const sponsorFeeValue = sponsorFee.data;
  const hasSponsorLink = sponsorFeeValue === undefined || (linkBalanceValue ?? 0n) >= sponsorFeeValue;
  const balance = source === "sepolia" ? sepoliaBalance.data : source === "amoy" ? amoyBalance.data : undefined;
  const enoughBalance = balance === undefined || amountUnits === undefined || balance >= amountUnits;
  const actionDisabled =
    !amountUnits ||
    !balance ||
    amountUnits <= 0n ||
    debouncedAmount !== amount ||
    !enoughBalance ||
    (!needsApproval && !hasSponsorLink);
  const linkFundUnits = useMemo(
    () => parseTokenAmount(linkFundAmount, resolvedLinkDecimals),
    [linkFundAmount, resolvedLinkDecimals],
  );
  function setMessageIdFromReceipt(receipt: { logs: readonly { data: `0x${string}`; topics: `0x${string}`[] }[] }) {
    for (const log of receipt.logs) {
      if (log.topics.length === 0) continue;
      try {
        const event = decodeEventLog({
          abi: contracts[source].RWATokenBridge.abi,
          data: log.data,
          topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
        });
        if (event.eventName === "TokensSent") {
          tx.setMessageId(String(event.args.messageId));
          return;
        }
      } catch {}
    }
  }

  async function submit() {
    if (!amountUnits || amountUnits <= 0n || !address) return;
    if (needsApproval)
      await tx.writeAndInvalidateQueries({
        address: contracts[source].RWAToken.address,
        abi: contracts[source].RWAToken.abi,
        functionName: "approve",
        args: [contracts[source].RWATokenBridge.address, amountUnits],
        chainId: chainConfig[source].id,
      });
    else {
      const { receipt } = await tx.writeAndInvalidateQueries({
        address: contracts[source].RWATokenBridge.address,
        abi: contracts[source].RWATokenBridge.abi,
        functionName: "sendTokenSponsored",
        args: [chainConfig[destination].ccipSelector, address as Address, amountUnits],
        chainId: chainConfig[source].id,
      });
      setMessageIdFromReceipt(receipt);
    }
  }
  async function fundBridgeLink() {
    if (!linkAddress || !linkFundUnits || linkFundUnits <= 0n) return;
    await fundTx.writeAndInvalidateQueries({
      address: linkAddress,
      abi: erc20Abi,
      functionName: "transfer",
      args: [contracts[source].RWATokenBridge.address, linkFundUnits],
      chainId: chainConfig[source].id,
    });
  }
  return (
    <div>
      <PageHeader
        title="Bridge mTRWA"
        description="Transfer mTRWA between Sepolia and Polygon Amoy using the deployed CCIP bridge contracts."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Cross-chain transfer</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <div className="flex items-center gap-2">
                  <div id="direction" className="flex h-10 flex-1 items-center text-lg font-semibold px-3">
                    {chainConfig[source].name} -&gt; {chainConfig[destination].name}
                  </div>
                  <Button
                    aria-label="Reverse bridge direction"
                    size="icon"
                    type="button"
                    variant="ghost"
                    dataIconClassName="size-16"
                    onClick={() => setDirectionIndex((current) => (current === 0 ? 1 : 0))}
                  >
                    <ArrowLeftRight data-icon="inline-start" />
                  </Button>
                </div>
              </Field>
              <Field>
                <FieldLabel htmlFor="bridge-amount">Amount</FieldLabel>
                <Input
                  id="bridge-amount"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="10"
                />
              </Field>
              <NetworkAction
                chainId={chainConfig[source].id}
                chainName={chainConfig[source].name}
                disabled={actionDisabled}
                pending={tx.isPending}
                onClick={submit}
              >
                {enoughBalance
                  ? needsApproval
                    ? "Approve mTRWA"
                    : "Send sponsored CCIP transfer"
                  : `Insufficient mTRWA balance on ${chainConfig[source].name}`}
              </NetworkAction>
              <TxStatus
                hash={tx.hash}
                txUrl={tx.hash ? explorerTxUrl(source, tx.hash) : undefined}
                ccipUrl={tx.messageId ? ccipMessageUrl(tx.messageId) : undefined}
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
              <CardTitle>Balances and route</CardTitle>
            </CardHeader>
            <CardContent>
              <InfoRow label="Source chain" value={chainConfig[source].name} />
              <InfoRow label="Destination chain" value={chainConfig[destination].name} />
              <InfoRow label="Sepolia mTRWA" value={formatTokenAmount(sepoliaBalance.data, 18, 4)} />
              <InfoRow label="Amoy mTRWA" value={formatTokenAmount(amoyBalance.data, 18, 4)} />
              <InfoRow label="Source allowance" value={formatTokenAmount(allowance.data, decimals, 4)} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Sponsored LINK funding</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup className="gap-3">
                <InfoRow
                  label="Bridge LINK balance"
                  value={`${formatTokenAmount(linkBalanceValue, resolvedLinkDecimals, 6)} ${String(linkSymbol.data ?? "LINK")}`}
                />
                <InfoRow
                  label="Expected Sponsor fee"
                  value={`${formatTokenAmount(sponsorFeeValue, resolvedLinkDecimals, 6)} ${String(linkSymbol.data ?? "LINK")}`}
                />
                <Field>
                  <FieldLabel htmlFor="link-fund-amount">LINK amount to fund</FieldLabel>
                  <Input
                    id="link-fund-amount"
                    inputMode="decimal"
                    value={linkFundAmount}
                    onChange={(event) => setLinkFundAmount(event.target.value)}
                    placeholder="1"
                  />
                </Field>
                <NetworkAction
                  chainId={chainConfig[source].id}
                  chainName={chainConfig[source].name}
                  disabled={!linkFundUnits || linkFundUnits <= 0n || !linkAddress}
                  pending={fundTx.isPending}
                  onClick={fundBridgeLink}
                >
                  Fill LINK to contract
                </NetworkAction>
                <TxStatus
                  hash={fundTx.hash}
                  txUrl={fundTx.hash ? explorerTxUrl(source, fundTx.hash) : undefined}
                  pending={fundTx.isPending}
                  success={fundTx.isSuccess}
                  error={fundTx.error}
                />
                {!hasSponsorLink ? (
                  <p className="text-sm text-destructive">
                    Bridge LINK balance is below the expected sponsor fee for this transfer.
                  </p>
                ) : null}
              </FieldGroup>
            </CardContent>
          </Card>
        </div>
        <Alert>
          <AlertTitle>Canonical accounting</AlertTitle>
          <AlertDescription>
            Sepolia is the canonical issuing chain. Amoy is the destination-chain representation; transfer does not
            change canonical accounting.
          </AlertDescription>
        </Alert>
        <Alert>
          <AlertTitle>Sponsored fees</AlertTitle>
          <AlertDescription>
            This demo uses sendTokenSponsored, so CCIP fees are paid by LINK already funded on the bridge contract.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
