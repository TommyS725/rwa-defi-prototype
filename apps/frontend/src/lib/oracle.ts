import { env } from "./env";

export type ReserveReport = {
  reportId: string;
  grossAssetValueUSD: string;
  liabilitiesUSD: string;
  feesUSD: string;
  adjustedOffchainReserveUSD: string;
  grossAssetValueUSD18: string;
  liabilitiesUSD18: string;
  feesUSD18: string;
  adjustedOffchainReserveUSD18: string;
  reserveValid: boolean;
  note: string;
  currency: "USD";
  decimals: 18;
  updatedAt: number;
  attestationHash: string;
};

export async function fetchReserveReport(): Promise<ReserveReport> {
  const response = await fetch(env.oracleApiUrl);
  if (!response.ok) throw new Error(`Oracle API returned ${response.status}`);
  return response.json() as Promise<ReserveReport>;
}
