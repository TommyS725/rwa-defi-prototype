import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import type { Abi, Address } from "viem";
import { usePublicClient, useWatchBlockNumber } from "wagmi";
import { chainConfig } from "@/lib/chains";
import { contracts } from "@/lib/contracts";

const POLLING_INTERVAL = 12_000;

type EventSpec = { address: Address; abi: Abi; eventName: string };

const sepoliaEventSpecs = [
  { address: contracts.sepolia.MockUSDC.address, abi: contracts.sepolia.MockUSDC.abi, eventName: "Transfer" },
  { address: contracts.sepolia.MockUSDC.address, abi: contracts.sepolia.MockUSDC.abi, eventName: "Approval" },
  { address: contracts.sepolia.RWAToken.address, abi: contracts.sepolia.RWAToken.abi, eventName: "Transfer" },
  { address: contracts.sepolia.RWAToken.address, abi: contracts.sepolia.RWAToken.abi, eventName: "Approval" },
  {
    address: contracts.sepolia.RWAMintControllerVault.address,
    abi: contracts.sepolia.RWAMintControllerVault.abi,
    eventName: "Minted",
  },
  {
    address: contracts.sepolia.RWAMintControllerVault.address,
    abi: contracts.sepolia.RWAMintControllerVault.abi,
    eventName: "Redeemed",
  },
  {
    address: contracts.sepolia.RWAMintControllerVault.address,
    abi: contracts.sepolia.RWAMintControllerVault.abi,
    eventName: "RedemptionRequested",
  },
] satisfies EventSpec[];

const amoyEventSpecs = [
  { address: contracts.amoy.RWAToken.address, abi: contracts.amoy.RWAToken.abi, eventName: "Transfer" },
  { address: contracts.amoy.RWAToken.address, abi: contracts.amoy.RWAToken.abi, eventName: "Approval" },
] satisfies EventSpec[];

const affectedAddresses = [...sepoliaEventSpecs, ...amoyEventSpecs].map((spec) => spec.address.toLowerCase());

function useBlockEventSync({ chainId, chainName, specs }: { chainId: number; chainName: string; specs: EventSpec[] }) {
  const publicClient = usePublicClient({ chainId });
  const queryClient = useQueryClient();
  const lastProcessedBlock = useRef<bigint | undefined>(undefined);
  const syncing = useRef(false);
  const pendingTargetBlock = useRef<bigint | undefined>(undefined);

  const invalidateRelevantQueries = useCallback(() => {
    void queryClient.invalidateQueries({
      predicate: (query) => {
        const key = JSON.stringify(query.queryKey).toLowerCase();
        return key.includes("readcontract") || affectedAddresses.some((address) => key.includes(address));
      },
    });
  }, [queryClient]);

  const syncToBlock = useCallback(
    async (blockNumber: bigint) => {
      if (!publicClient) return;

      if (syncing.current) {
        pendingTargetBlock.current =
          pendingTargetBlock.current && pendingTargetBlock.current > blockNumber
            ? pendingTargetBlock.current
            : blockNumber;
        return;
      }

      syncing.current = true;
      let targetBlock = blockNumber;

      try {
        while (true) {
          const fromBlock = (lastProcessedBlock.current ?? targetBlock - 1n) + 1n;
          if (fromBlock <= targetBlock) {
            const eventGroups = await Promise.all(
              specs.map((spec) =>
                publicClient.getContractEvents({
                  address: spec.address,
                  abi: spec.abi,
                  eventName: spec.eventName as never,
                  fromBlock,
                  toBlock: targetBlock,
                }),
              ),
            );

            if (eventGroups.some((events: readonly unknown[]) => events.length > 0)) {
              invalidateRelevantQueries();
            }

            lastProcessedBlock.current = targetBlock;
          }

          const pending = pendingTargetBlock.current;
          pendingTargetBlock.current = undefined;
          if (!pending || pending <= targetBlock) break;
          targetBlock = pending;
        }
      } catch (error) {
        console.warn(`Failed to sync ${chainName} contract events`, error);
      } finally {
        syncing.current = false;
      }
    },
    [chainName, invalidateRelevantQueries, publicClient, specs],
  );

  useWatchBlockNumber({
    chainId,
    pollingInterval: POLLING_INTERVAL,
    onBlockNumber: (blockNumber) => {
      void syncToBlock(blockNumber);
    },
  });
}

export function ContractEventSync() {
  useBlockEventSync({
    chainId: chainConfig.sepolia.id,
    chainName: chainConfig.sepolia.name,
    specs: sepoliaEventSpecs,
  });
  useBlockEventSync({
    chainId: chainConfig.amoy.id,
    chainName: chainConfig.amoy.name,
    specs: amoyEventSpecs,
  });

  return null;
}
