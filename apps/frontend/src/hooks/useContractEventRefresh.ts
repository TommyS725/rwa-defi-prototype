import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useWatchContractEvent } from "wagmi";
import { chainConfig } from "@/lib/chains";
import { contracts } from "@/lib/contracts";

export function useContractEventRefresh() {
  const queryClient = useQueryClient();
  const refresh = useCallback(() => {
    void queryClient.invalidateQueries();
  }, [queryClient]);

  useWatchContractEvent({
    address: contracts.sepolia.MockUSDC.address,
    abi: contracts.sepolia.MockUSDC.abi,
    eventName: "Transfer",
    chainId: chainConfig.sepolia.id,
    onLogs: refresh,
  });
  useWatchContractEvent({
    address: contracts.sepolia.MockUSDC.address,
    abi: contracts.sepolia.MockUSDC.abi,
    eventName: "Approval",
    chainId: chainConfig.sepolia.id,
    onLogs: refresh,
  });
  useWatchContractEvent({
    address: contracts.sepolia.RWAToken.address,
    abi: contracts.sepolia.RWAToken.abi,
    eventName: "Transfer",
    chainId: chainConfig.sepolia.id,
    onLogs: refresh,
  });
  useWatchContractEvent({
    address: contracts.sepolia.RWAToken.address,
    abi: contracts.sepolia.RWAToken.abi,
    eventName: "Approval",
    chainId: chainConfig.sepolia.id,
    onLogs: refresh,
  });
  useWatchContractEvent({
    address: contracts.amoy.RWAToken.address,
    abi: contracts.amoy.RWAToken.abi,
    eventName: "Transfer",
    chainId: chainConfig.amoy.id,
    onLogs: refresh,
  });
  useWatchContractEvent({
    address: contracts.amoy.RWAToken.address,
    abi: contracts.amoy.RWAToken.abi,
    eventName: "Approval",
    chainId: chainConfig.amoy.id,
    onLogs: refresh,
  });
  useWatchContractEvent({
    address: contracts.sepolia.RWAMintControllerVault.address,
    abi: contracts.sepolia.RWAMintControllerVault.abi,
    eventName: "Minted",
    chainId: chainConfig.sepolia.id,
    onLogs: refresh,
  });
  useWatchContractEvent({
    address: contracts.sepolia.RWAMintControllerVault.address,
    abi: contracts.sepolia.RWAMintControllerVault.abi,
    eventName: "Redeemed",
    chainId: chainConfig.sepolia.id,
    onLogs: refresh,
  });
  useWatchContractEvent({
    address: contracts.sepolia.RWAMintControllerVault.address,
    abi: contracts.sepolia.RWAMintControllerVault.abi,
    eventName: "RedemptionRequested",
    chainId: chainConfig.sepolia.id,
    onLogs: refresh,
  });
}
