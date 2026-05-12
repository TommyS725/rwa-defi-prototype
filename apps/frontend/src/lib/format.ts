import { formatUnits, parseUnits } from "viem";

export function parseTokenAmount(value: string, decimals: number): bigint | undefined {
  const trimmed = value.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return undefined;
  try {
    return parseUnits(trimmed, decimals);
  } catch {
    return undefined;
  }
}

export function formatTokenAmount(value: bigint | undefined, decimals: number, maxFractionDigits = 4) {
  if (value === undefined) return "-";
  return trimDecimals(formatUnits(value, decimals), maxFractionDigits);
}

export function formatUsd18(value: bigint | undefined, maxFractionDigits = 2) {
  if (value === undefined) return "-";
  return `$${trimDecimals(formatUnits(value, 18), maxFractionDigits)}`;
}

export function formatIntegerString(value: string | undefined) {
  if (!value) return "-";
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function formatTimestamp(seconds: bigint | number | undefined) {
  if (seconds === undefined) return "-";
  const numeric = typeof seconds === "bigint" ? Number(seconds) : seconds;
  if (numeric === 0) return "Never";
  return new Date(numeric * 1000).toLocaleString();
}

export function shortenAddress(address: string | undefined) {
  if (!address) return "Not connected";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function trimDecimals(value: string, maxFractionDigits: number) {
  const [whole, fraction] = value.split(".");
  if (!fraction || maxFractionDigits === 0) return whole;
  const trimmed = fraction.slice(0, maxFractionDigits).replace(/0+$/, "");
  return trimmed ? `${whole}.${trimmed}` : whole;
}
