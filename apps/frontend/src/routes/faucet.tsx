import { useAppKitAccount } from "@reown/appkit/react";
import { type Address, zeroAddress } from "viem";
import { useReadContract } from "wagmi";
import { InfoRow } from "@/components/InfoRow";
import { NetworkAction } from "@/components/NetworkAction";
import { PageHeader } from "@/components/PageHeader";
import { TxStatus } from "@/components/TxStatus";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useContractTransaction } from "@/hooks/useTransaction";
import { chainConfig, explorerTxUrl } from "@/lib/chains";
import { contracts, USDC_DECIMALS } from "@/lib/contracts";
import { formatTimestamp, formatTokenAmount } from "@/lib/format";

export function FaucetPage() {
  const { address } = useAppKitAccount();
  const account = (address ?? zeroAddress) as Address;
  const tx = useContractTransaction();
  const balance = useReadContract({
    address: contracts.sepolia.MockUSDC.address,
    abi: contracts.sepolia.MockUSDC.abi,
    functionName: "balanceOf",
    args: [account],
    chainId: chainConfig.sepolia.id,
    query: { enabled: Boolean(address) },
  });
  const lastFaucet = useReadContract({
    address: contracts.sepolia.MockUSDC.address,
    abi: contracts.sepolia.MockUSDC.abi,
    functionName: "getLastFaucetAt",
    args: [account],
    chainId: chainConfig.sepolia.id,
    query: { enabled: Boolean(address) },
  });
  const faucetAmount = useReadContract({
    address: contracts.sepolia.MockUSDC.address,
    abi: contracts.sepolia.MockUSDC.abi,
    functionName: "getFaucetAmount",
    chainId: chainConfig.sepolia.id,
  });
  const last = lastFaucet.data ?? 0n;
  const availableAt = last + 3600n;
  const canRequest = last === 0n || BigInt(Math.floor(Date.now() / 1000)) >= availableAt;
  async function requestFaucet() {
    await tx.writeAndInvalidateQueries({
      address: contracts.sepolia.MockUSDC.address,
      abi: contracts.sepolia.MockUSDC.abi,
      functionName: "faucet",
      chainId: chainConfig.sepolia.id,
    });
  }
  return (
    <div>
      <PageHeader
        title="MockUSDC faucet"
        description="Request Sepolia MockUSDC for minting mTRWA tokens in the demo."
      />
      <Card>
        <CardHeader>
          <CardTitle>Faucet status</CardTitle>
        </CardHeader>
        <CardContent>
          <InfoRow label="Your MockUSDC balance" value={`${formatTokenAmount(balance.data, USDC_DECIMALS, 2)} mUSDC`} />
          <InfoRow label="Last faucet request" value={formatTimestamp(last)} />
          <InfoRow label="Next available" value={canRequest ? "Now" : formatTimestamp(availableAt)} />
          <InfoRow
            label="Reported faucet amount"
            value={`${formatTokenAmount(faucetAmount.data, USDC_DECIMALS, 2)} mUSDC`}
          />
        </CardContent>
        <CardFooter className="flex-col items-start gap-4">
          <NetworkAction
            chainId={chainConfig.sepolia.id}
            chainName="Sepolia"
            disabled={!canRequest}
            pending={tx.isPending}
            onClick={requestFaucet}
          >
            Request faucet
          </NetworkAction>
          <TxStatus
            hash={tx.hash}
            txUrl={tx.hash ? explorerTxUrl("sepolia", tx.hash) : undefined}
            pending={tx.isPending}
            success={tx.isSuccess}
            error={tx.error}
          />
        </CardFooter>
      </Card>
    </div>
  );
}
