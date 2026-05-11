const USD18_MULTIPLIER = 10n ** 18n;

const toUsd18String = (amount: bigint): string =>
  (amount * USD18_MULTIPLIER).toString();

const validateNonNegative = (value: bigint, label: string) => {
  if (value < 0n) {
    throw new Error(`${label} must be >= 0`);
  }
};

const sha256Hex = async (payload: string): Promise<string> => {
  //@ts-ignore -- TextEncoder is available in Cloudflare Workers runtime
  const data = new TextEncoder().encode(payload);
  //@ts-ignore -- TextEncoder is available in Cloudflare Workers runtime
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(digest);
  const hex = Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `0x${hex}`;
};

export { sha256Hex, toUsd18String, validateNonNegative };
