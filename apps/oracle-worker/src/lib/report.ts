import type { ReserveReport } from "./types";
import { sha256Hex, toUsd18String, validateNonNegative } from "./utils";
import type { AdminUpdateInput } from "./types";

const DEFAULT_REPORT_INPUT = {
  reportId: "mock-rwa-report-001",
  grossAssetValueUSD: "1030000",
  liabilitiesUSD: "20000",
  feesUSD: "10000",
  adjustedOffchainReserveUSD: "1000000",
  reserveValid: true,
  note: "Default demo report",
};

const buildReport = async (input: AdminUpdateInput): Promise<ReserveReport> => {
  const adjustedOffchainReserveUSD =
    input.grossAssetValueUSD - input.liabilitiesUSD - input.feesUSD;
  validateNonNegative(adjustedOffchainReserveUSD, "adjustedOffchainReserveUSD");

  const reportBase = {
    reportId: input.reportId,
    grossAssetValueUSD: input.grossAssetValueUSD.toString(),
    liabilitiesUSD: input.liabilitiesUSD.toString(),
    feesUSD: input.feesUSD.toString(),
    adjustedOffchainReserveUSD: adjustedOffchainReserveUSD.toString(),
    grossAssetValueUSD18: toUsd18String(input.grossAssetValueUSD),
    liabilitiesUSD18: toUsd18String(input.liabilitiesUSD),
    feesUSD18: toUsd18String(input.feesUSD),
    adjustedOffchainReserveUSD18: toUsd18String(adjustedOffchainReserveUSD),
    reserveValid: input.reserveValid,
    note: input.note,
    currency: "USD" as const,
    decimals: 18 as const,
    updatedAt: Math.floor(Date.now() / 1000),
  };

  const attestationHash = await sha256Hex(JSON.stringify(reportBase));
  return {
    ...reportBase,
    attestationHash,
  };
};

export { DEFAULT_REPORT_INPUT, buildReport };
