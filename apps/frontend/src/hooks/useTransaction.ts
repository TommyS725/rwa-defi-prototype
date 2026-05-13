import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { Hash } from "viem";
import { useConfig, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";

export function useContractTransaction() {
  const [hash, setHash] = useState<Hash | undefined>();
  const [messageId, setMessageId] = useState<string | undefined>();
  const config = useConfig();
  const queryClient = useQueryClient();
  const write = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });

  async function writeAsync(...args: Parameters<typeof write.writeContractAsync>) {
    setMessageId(undefined);
    setHash(undefined);
    write.reset();
    const nextHash = await write.writeContractAsync(...args);
    setHash(nextHash);
    return nextHash;
  }

  return {
    hash,
    messageId,
    setMessageId,
    writeAsync,
    writeAndInvalidateQueries: async (...args: Parameters<typeof writeAsync>) => {
      const nextHash = await writeAsync(...args);
      const request = args[0] as { chainId?: number };
      const nextReceipt = await waitForTransactionReceipt(config, {
        chainId: request.chainId,
        hash: nextHash,
      });
      await queryClient.invalidateQueries();
      return {
        hash: nextHash,
        receipt: nextReceipt,
      };
    },
    isPending: write.isPending || receipt.isLoading,
    isSuccess: receipt.isSuccess,
    error: write.error ?? receipt.error,
    receipt: receipt.data,
    reset: () => {
      setHash(undefined);
      setMessageId(undefined);
      write.reset();
    },
  };
}
