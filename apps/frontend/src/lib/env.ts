type Env = {
  reownProjectId: string;
  oracleApiUrl: string;
  oracleAdminUrl: string;
  sepoliaCcipSelector: bigint;
  amoyCcipSelector: bigint;
  sepoliaExplorerUrl: string;
  amoyExplorerUrl: string;
  ccipExplorerUrl: string;
  ccipTokenManagerUrl: string;
  githubRepoUrl?: string;
};

function required(name: string): string {
  const value = import.meta.env[name];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

function optional(name: string): string | undefined {
  const value = import.meta.env[name];
  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : undefined;
}

function requiredBigInt(name: string): bigint {
  try {
    return BigInt(required(name));
  } catch {
    throw new Error(`Environment variable ${name} must be an integer string`);
  }
}

function stripSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export const env: Env = {
  reownProjectId: required("VITE_REOWN_PROJECT_ID"),
  oracleApiUrl: required("VITE_ORACLE_API_URL"),
  oracleAdminUrl: required("VITE_ORACLE_ADMIN_URL"),
  sepoliaCcipSelector: requiredBigInt("VITE_SEPOLIA_CCIP_SELECTOR"),
  amoyCcipSelector: requiredBigInt("VITE_AMOY_CCIP_SELECTOR"),
  sepoliaExplorerUrl: stripSlash(required("VITE_SEPOLIA_EXPLORER_URL")),
  amoyExplorerUrl: stripSlash(required("VITE_AMOY_EXPLORER_URL")),
  ccipExplorerUrl: stripSlash(required("VITE_CCIP_EXPLORER_URL")),
  ccipTokenManagerUrl: stripSlash(
    required("VITE_MTRWA_CCIP_TOKEN_MANAGER_URL"),
  ),
  githubRepoUrl: optional("VITE_GITHUB_REPO_URL"),
};
