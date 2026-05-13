import { useAppKitAccount } from "@reown/appkit/react";
import { useMemo, useState } from "react";
import { type Address, isAddress, zeroAddress } from "viem";
import { useReadContract } from "wagmi";
import { InfoRow } from "@/components/InfoRow";
import { NetworkAction } from "@/components/NetworkAction";
import { PageHeader } from "@/components/PageHeader";
import { TxStatus } from "@/components/TxStatus";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useContractTransaction } from "@/hooks/useTransaction";
import { type ChainKey, chainConfig, explorerTxUrl } from "@/lib/chains";
import { contracts, erc20Abi } from "@/lib/contracts";
import { formatTokenAmount, parseTokenAmount, shortenAddress } from "@/lib/format";

type TokenOption = {
  id: string;
  label: string;
  chain: ChainKey;
  address: Address;
};

type SpenderOption = {
  id: string;
  label: string;
  address: Address;
};

const tokenOptions = [
  { id: "sepolia-usdc", label: "Sepolia MockUSDC", chain: "sepolia", address: contracts.sepolia.MockUSDC.address },
  { id: "sepolia-rwa", label: "Sepolia mTRWA", chain: "sepolia", address: contracts.sepolia.RWAToken.address },
  { id: "amoy-rwa", label: "Amoy mTRWA", chain: "amoy", address: contracts.amoy.RWAToken.address },
] as const satisfies readonly TokenOption[];

const customSpenderId = "custom";

function spenderOptionsFor(token: TokenOption): SpenderOption[] {
  const options: SpenderOption[] = [];
  if (token.chain === "sepolia") {
    options.push({
      id: "controller",
      label: "RWAMintControllerVault",
      address: contracts.sepolia.RWAMintControllerVault.address,
    });
  }
  options.push({
    id: "bridge",
    label: `${chainConfig[token.chain].name} bridge`,
    address: contracts[token.chain].RWATokenBridge.address,
  });
  return options;
}

const presets = [
  {
    label: "MockUSDC -> Controller",
    tokenId: "sepolia-usdc",
    spenderId: "controller",
  },
  {
    label: "Sepolia mTRWA -> Controller",
    tokenId: "sepolia-rwa",
    spenderId: "controller",
  },
  {
    label: "Sepolia mTRWA -> Bridge",
    tokenId: "sepolia-rwa",
    spenderId: "bridge",
  },
  {
    label: "Amoy mTRWA -> Bridge",
    tokenId: "amoy-rwa",
    spenderId: "bridge",
  },
] as const;

export function AllowancePage() {
  const { address } = useAppKitAccount();
  const account = (address ?? zeroAddress) as Address;
  const tx = useContractTransaction();
  const [tokenId, setTokenId] = useState<string>(tokenOptions[0].id);
  const token = tokenOptions.find((item) => item.id === tokenId) ?? tokenOptions[0];
  const spenderOptions = spenderOptionsFor(token);
  const [spenderId, setSpenderId] = useState<string>(spenderOptions[0]?.id ?? customSpenderId);
  const [customSpender, setCustomSpender] = useState("");
  const [amount, setAmount] = useState("");
  const debouncedCustomSpender = useDebouncedValue(customSpender);
  const selectedSpender = spenderOptions.find((item) => item.id === spenderId);
  const spender = selectedSpender?.address ?? (isAddress(debouncedCustomSpender) ? debouncedCustomSpender : undefined);
  const spenderForApprove = selectedSpender?.address ?? (isAddress(customSpender) ? customSpender : undefined);

  const decimals = useReadContract({
    address: token.address,
    abi: erc20Abi,
    functionName: "decimals",
    chainId: chainConfig[token.chain].id,
  });
  const symbol = useReadContract({
    address: token.address,
    abi: erc20Abi,
    functionName: "symbol",
    chainId: chainConfig[token.chain].id,
  });
  const allowance = useReadContract({
    address: token.address,
    abi: erc20Abi,
    functionName: "allowance",
    args: [account, spender ?? zeroAddress],
    chainId: chainConfig[token.chain].id,
    query: { enabled: Boolean(address && spender) },
  });
  const tokenDecimals = Number(decimals.data ?? 18);
  const amountUnits = useMemo(() => parseTokenAmount(amount, tokenDecimals), [amount, tokenDecimals]);

  function applyPreset(tokenId: string, spenderId: string) {
    setTokenId(tokenId);
    setSpenderId(spenderId);
    setCustomSpender("");
  }

  async function approve() {
    if (!spenderForApprove || amountUnits === undefined) return;
    await tx.writeAndInvalidateQueries({
      address: token.address,
      abi: erc20Abi,
      functionName: "approve",
      args: [spenderForApprove, amountUnits],
      chainId: chainConfig[token.chain].id,
    });
  }

  return (
    <div>
      <PageHeader
        title="Manage allowances"
        description="Inspect and update wallet allowances for MockUSDC and mTRWA spenders used by the controller and bridges."
      />
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Allowance controls</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel>Source token</FieldLabel>
                <Select
                  value={token.id}
                  onValueChange={(value) => {
                    const nextToken = tokenOptions.find((item) => item.id === value) ?? tokenOptions[0];
                    setTokenId(nextToken.id);
                    setSpenderId(spenderOptionsFor(nextToken)[0]?.id ?? customSpenderId);
                    setCustomSpender("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {tokenOptions.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Spender</FieldLabel>
                <Select value={spenderId} onValueChange={setSpenderId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {spenderOptions.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.label}
                        </SelectItem>
                      ))}
                      <SelectItem value={customSpenderId}>Custom address</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              {spenderId === customSpenderId ? (
                <Field>
                  <FieldLabel htmlFor="custom-spender">Custom spender address</FieldLabel>
                  <Input
                    id="custom-spender"
                    value={customSpender}
                    onChange={(event) => setCustomSpender(event.target.value)}
                    placeholder="0x..."
                  />
                </Field>
              ) : null}
              <InfoRow label="Connected owner" value={address ? shortenAddress(address) : "Not connected"} />
              <InfoRow
                label="Current allowance"
                value={`${formatTokenAmount(allowance.data, tokenDecimals, 6)} ${String(symbol.data ?? "token")}`}
              />
              <Field>
                <FieldLabel htmlFor="allowance-amount">New allowance</FieldLabel>
                <Input
                  id="allowance-amount"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0"
                />
              </Field>
              <NetworkAction
                chainId={chainConfig[token.chain].id}
                chainName={chainConfig[token.chain].name}
                disabled={!spenderForApprove || amountUnits === undefined}
                pending={tx.isPending}
                onClick={approve}
              >
                Update allowance
              </NetworkAction>
              <TxStatus
                hash={tx.hash}
                txUrl={tx.hash ? explorerTxUrl(token.chain, tx.hash) : undefined}
                pending={tx.isPending}
                success={tx.isSuccess}
                error={tx.error}
              />
            </FieldGroup>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Common allowances</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Allowance</TableHead>
                  <TableHead>Network</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {presets.map((preset) => {
                  const presetToken = tokenOptions.find((item) => item.id === preset.tokenId) ?? tokenOptions[0];
                  return (
                    <TableRow key={preset.label}>
                      <TableCell className="font-medium">{preset.label}</TableCell>
                      <TableCell>{chainConfig[presetToken.chain].name}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => applyPreset(preset.tokenId, preset.spenderId)}
                        >
                          Set
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
