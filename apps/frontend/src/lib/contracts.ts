import {
  amoyContracts,
  mockUSDCAbi,
  rWAMintControllerVaultAbi,
  rWATokenAbi,
  rWATokenBridgeAbi,
  reserveOracleAbi,
  sepoliaContracts,
} from "@rwa/contracts";

export const contracts = {
  sepolia: sepoliaContracts,
  amoy: amoyContracts,
} as const;

export const erc20Abi = mockUSDCAbi;
export const USDC_DECIMALS = 6;
export const USD_DECIMALS = 18;

export type MockUSDCAbi = typeof mockUSDCAbi;
export type RWATokenAbi = typeof rWATokenAbi;
export type RWAMintControllerVaultAbi = typeof rWAMintControllerVaultAbi;
export type RWATokenBridgeAbi = typeof rWATokenBridgeAbi;
export type ReserveOracleAbi = typeof reserveOracleAbi;
