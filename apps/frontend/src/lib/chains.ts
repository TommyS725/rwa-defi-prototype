import { polygonAmoy, sepolia } from "@reown/appkit/networks";
import { env } from "./env";

export const chainConfig = {
  sepolia: { ...sepolia, ccipSelector: env.sepoliaCcipSelector, explorerUrl: env.sepoliaExplorerUrl },
  amoy: { ...polygonAmoy, ccipSelector: env.amoyCcipSelector, explorerUrl: env.amoyExplorerUrl },
} as const;

export type ChainKey = keyof typeof chainConfig;

export function explorerAddressUrl(chain: ChainKey, address: string) {
  return `${chainConfig[chain].explorerUrl}/address/${address}`;
}

export function explorerTxUrl(chain: ChainKey, txHash: string) {
  return `${chainConfig[chain].explorerUrl}/tx/${txHash}`;
}

export function ccipMessageUrl(messageId: string) {
  return `${env.ccipExplorerUrl}/msg/${messageId}`;
}
