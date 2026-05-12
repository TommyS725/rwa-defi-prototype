import { useReadContract } from "wagmi";
import { contracts } from "@/lib/contracts";

export function useRwaDecimals(chain: "sepolia" | "amoy" = "sepolia") {
  const result = useReadContract({
    address: contracts[chain].RWAToken.address,
    abi: contracts[chain].RWAToken.abi,
    functionName: "decimals",
    chainId: contracts[chain].RWAToken.chainId,
  });

  return { ...result, decimals: result.data === undefined ? 18 : Number(result.data) };
}
