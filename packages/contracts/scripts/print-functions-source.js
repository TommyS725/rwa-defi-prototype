import fs from "node:fs/promises";

const filePath = process.argv[2] || "./oracle/source.js";

let source = await fs.readFile(filePath, "utf8");

source = source
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/"/g, "'")
  .split("\n")
  .map((line) => line.replace(/^\s*\/\/.*$/g, "").trim())
  .filter(Boolean)
  .join("");

console.log("\n=== Copy this ===\n");
console.log(source);
console.log("\n=== End ===\n");
