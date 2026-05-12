import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type DeploymentFile = {
  chainId: number;
  chainName: string;
  contracts: Record<string, string>;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packageRoot = path.resolve(__dirname, "..");
const artifactsDir = path.join(packageRoot, "artifacts");
const deploymentsDir = path.join(packageRoot, "deployments");
const outputFile = path.join(packageRoot, "generated", "index.ts");

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function findMetadataFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    throw new Error(`Artifacts directory not found: ${dir}`);
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...findMetadataFiles(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith("_metadata.json")) {
      files.push(fullPath);
    }
  }

  return files;
}

function inferContractName(metadata: any, filePath: string): string {
  const target = metadata?.settings?.compilationTarget;

  if (target && typeof target === "object") {
    const values = Object.values(target);
    if (values.length > 0 && typeof values[0] === "string") {
      return values[0];
    }
  }

  return path.basename(filePath).replace("_metadata.json", "");
}

function toIdentifier(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9_$]/g, "_");

  if (/^[0-9]/.test(cleaned)) {
    return `_${cleaned}`;
  }

  return cleaned;
}

function toCamelCase(name: string): string {
  const safe = toIdentifier(name);
  return safe.charAt(0).toLowerCase() + safe.slice(1);
}

function isAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function loadAbis(): Record<string, any[]> {
  const metadataFiles = findMetadataFiles(artifactsDir);

  const abis: Record<string, any[]> = {};

  for (const filePath of metadataFiles) {
    const metadata = readJson<any>(filePath);
    const abi = metadata?.output?.abi;

    if (!Array.isArray(abi)) {
      console.warn(`Skipping ${filePath}: missing output.abi`);
      continue;
    }

    const contractName = inferContractName(metadata, filePath);

    // Skip duplicate names only if same contract appears multiple times.
    // Last one wins, which is fine for Remix regeneration.
    abis[contractName] = abi;
  }

  return abis;
}

function loadDeployments(): Record<string, DeploymentFile> {
  if (!fs.existsSync(deploymentsDir)) {
    return {};
  }

  const files = fs
    .readdirSync(deploymentsDir)
    .filter((file) => file.endsWith(".json"));

  const deployments: Record<string, DeploymentFile> = {};

  for (const file of files) {
    const fullPath = path.join(deploymentsDir, file);
    const deployment = readJson<DeploymentFile>(fullPath);

    const exportName = path.basename(file, ".json");
    deployments[exportName] = deployment;
  }

  return deployments;
}

function generateAbiExports(abis: Record<string, any[]>): string {
  const parts: string[] = [];

  const names = Object.keys(abis).sort();

  for (const contractName of names) {
    const varName = `${toCamelCase(contractName)}Abi`;

    parts.push(
      `export const ${varName} = ${JSON.stringify(
        abis[contractName],
        null,
        2,
      )} as const;`,
    );
  }

  return parts.join("\n\n");
}

function generateAbiMap(abis: Record<string, any[]>): string {
  const entries = Object.keys(abis)
    .sort()
    .map((contractName) => {
      const varName = `${toCamelCase(contractName)}Abi`;
      return `  ${toIdentifier(contractName)}: ${varName}`;
    });

  return `export const contractAbis = {\n${entries.join(",\n")}\n} as const;`;
}

function generateDeploymentExports(
  abis: Record<string, any[]>,
  deployments: Record<string, DeploymentFile>,
): string {
  const parts: string[] = [];

  for (const [chainKey, deployment] of Object.entries(deployments).sort()) {
    const chainExportName = `${toCamelCase(chainKey)}Contracts`;

    const entries: string[] = [];

    for (const [contractName, address] of Object.entries(
      deployment.contracts,
    ).sort()) {
      if (!abis[contractName]) {
        console.warn(
          `Skipping ${chainKey}.${contractName}: no matching ABI metadata`,
        );
        continue;
      }

      if (!isAddress(address)) {
        console.warn(
          `Skipping ${chainKey}.${contractName}: invalid address ${address}`,
        );
        continue;
      }

      const abiVarName = `${toCamelCase(contractName)}Abi`;

      entries.push(`  ${toIdentifier(contractName)}: {
    chainId: ${deployment.chainId},
    chainName: "${deployment.chainName}",
    address: "${address}",
    abi: ${abiVarName}
  }`);
    }

    parts.push(
      `export const ${chainExportName} = {\n${entries.join(
        ",\n",
      )}\n} as const;`,
    );
  }

  return parts.join("\n\n");
}

function main() {
  const abis = loadAbis();
  const deployments = loadDeployments();

  const output = `/* Autogenerated by packages/contracts/scripts/generate-types.ts */
/* Do not edit manually. */

${generateAbiExports(abis)}

${generateAbiMap(abis)}

${generateDeploymentExports(abis, deployments)}
`;

  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, output);

  console.log(`Generated ${outputFile}`);
  console.log(`Contracts found: ${Object.keys(abis).sort().join(", ")}`);
}

main();
