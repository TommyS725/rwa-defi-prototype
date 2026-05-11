import type { KVNamespace } from "@cloudflare/workers-types";
import { z } from "zod";

const wholeDollarSchema = z
  .string()
  .trim()
  .regex(/^[0-9]+$/, "Value must be a whole-dollar integer")
  .transform((value) => BigInt(value));

const reserveValidSchema = z
  .string()
  .trim()
  .toLowerCase()
  .refine((value) => value === "true" || value === "false", {
    message: "reserveValid must be true or false",
  })
  .transform((value) => value === "true");

const ReserveReportSchema = z.object({
  reportId: z.string(),
  grossAssetValueUSD: z.string(),
  liabilitiesUSD: z.string(),
  feesUSD: z.string(),
  adjustedOffchainReserveUSD: z.string(),
  grossAssetValueUSD18: z.string(),
  liabilitiesUSD18: z.string(),
  feesUSD18: z.string(),
  adjustedOffchainReserveUSD18: z.string(),
  reserveValid: z.boolean(),
  note: z.string(),
  currency: z.literal("USD"),
  decimals: z.literal(18),
  updatedAt: z.number(),
  attestationHash: z.string(),
});

const adminUpdateSchema = z.object({
  reportId: z.string().trim().min(1, "reportId is required"),
  grossAssetValueUSD: wholeDollarSchema,
  liabilitiesUSD: wholeDollarSchema,
  feesUSD: wholeDollarSchema,
  reserveValid: reserveValidSchema,
  note: z
    .string()
    .optional()
    .transform((value) => (value ?? "").trim()),
});

type ReserveReport = z.infer<typeof ReserveReportSchema>;
type AdminUpdateInput = z.infer<typeof adminUpdateSchema>;

type Env = {
  RWA_ORACLE_KV: KVNamespace;
};

export { adminUpdateSchema, ReserveReportSchema };
export type { AdminUpdateInput, ReserveReport, Env };
