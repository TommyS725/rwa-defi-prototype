import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import type { ReactNode } from "react";
import { useChainId, useSwitchChain } from "wagmi";
import { Button } from "@/components/ui/button";

export function NetworkAction({
  chainId,
  chainName,
  disabled,
  pending,
  onClick,
  children,
}: {
  chainId: number;
  chainName: string;
  disabled?: boolean;
  pending?: boolean;
  onClick: () => void | Promise<void>;
  children: ReactNode;
}) {
  const activeChainId = useChainId();
  const { isConnected } = useAppKitAccount();
  const { open } = useAppKit();
  const switchChain = useSwitchChain();

  if (!isConnected) return <Button onClick={() => void open()}>Connect wallet</Button>;
  if (activeChainId !== chainId) {
    return (
      <Button
        variant="secondary"
        onClick={() => void switchChain.switchChainAsync({ chainId })}
        disabled={switchChain.isPending}
      >
        Switch to {chainName}
      </Button>
    );
  }
  return (
    <Button onClick={() => void onClick()} disabled={disabled || pending}>
      {pending ? "Waiting..." : children}
    </Button>
  );
}
