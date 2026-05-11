import fs from "node:fs/promises";
import { simulateScript } from "@chainlink/functions-toolkit";
import { ethers } from "ethers";

const source = await fs.readFile("./oracle/source.js", "utf8");

const args = [
  "https://oracle-worker.rwa-defi-prototype.tommyshum.com/api/reserve/latest",
];
const result = await simulateScript({
  source,
  args,
  secrets: {},
});

console.dir(result, { depth: null });

if (result.errorString) {
  throw new Error(result.errorString);
}

if (!result.responseBytesHexstring) {
  throw new Error("No responseBytesHexstring returned");
}

const types = ["uint256", "bool", "uint256", "bytes32"];

const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
  types,
  result.responseBytesHexstring,
);

const [adjustedOffchainReserveUSD, reserveValid, updatedAt, attestationHash] =
  decoded;

console.log("Decoded result:");
console.log({
  adjustedOffchainReserveUSD: adjustedOffchainReserveUSD.toString(),
  reserveValid,
  updatedAt: updatedAt.toString(),
  attestationHash,
});
