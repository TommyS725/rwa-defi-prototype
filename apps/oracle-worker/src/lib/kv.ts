import type { KVNamespace } from "@cloudflare/workers-types";
import type { ReserveReport } from "./types";
import { buildReport, DEFAULT_REPORT_INPUT } from "./report";

const RESERVE_KEY = "reserve:latest";

const saveReport = async (kv: KVNamespace, report: ReserveReport) => {
  await kv.put(RESERVE_KEY, JSON.stringify(report));
};

const loadReport = async (kv: KVNamespace): Promise<ReserveReport | null> => {
  const stored = await kv.get(RESERVE_KEY);
  if (!stored) {
    return null;
  }
  return JSON.parse(stored) as ReserveReport;
};

const getOrInitReport = async (kv: KVNamespace): Promise<ReserveReport> => {
  const existing = await loadReport(kv);
  if (existing) {
    return existing;
  }

  const report = await buildReport({
    reportId: DEFAULT_REPORT_INPUT.reportId,
    grossAssetValueUSD: BigInt(DEFAULT_REPORT_INPUT.grossAssetValueUSD),
    liabilitiesUSD: BigInt(DEFAULT_REPORT_INPUT.liabilitiesUSD),
    feesUSD: BigInt(DEFAULT_REPORT_INPUT.feesUSD),
    reserveValid: DEFAULT_REPORT_INPUT.reserveValid,
    note: DEFAULT_REPORT_INPUT.note,
  });

  await saveReport(kv, report);
  return report;
};

export { getOrInitReport, loadReport, saveReport };
