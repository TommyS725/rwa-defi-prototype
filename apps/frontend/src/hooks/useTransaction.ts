import { useState } from "react";
import type { Hash } from "viem";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";

export function useContractTransaction() {
  const [hash, setHash] = useState<Hash | undefined>();
  const [messageId, setMessageId] = useState<string | undefined>();
  const write = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });

  return {
    hash,
    messageId,
    setMessageId,
    writeAsync: async (...args: Parameters<typeof write.writeContractAsync>) => {
      setMessageId(undefined);
      const nextHash = await write.writeContractAsync(...args);
      setHash(nextHash);
      return nextHash;
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
