import type { AppType } from "@rwa/oracle-worker";
import { hc, type InferResponseType } from "hono/client";
import { env } from "./env";

const oracleClient = hc<AppType>(env.oracleWorkerUrl);

export const oracleApiUrl = oracleClient.api.v1.reserve.latest.$url().toString();
export const oracleAdminUrl = oracleClient.admin.$url().toString();

export type ReserveReport = InferResponseType<typeof oracleClient.api.v1.reserve.latest.$get, 200>;

export async function fetchReserveReport(): Promise<ReserveReport> {
  const response = await oracleClient.api.v1.reserve.latest.$get();
  if (!response.ok) throw new Error(`Oracle API returned ${response.status}`);
  return response.json();
}
