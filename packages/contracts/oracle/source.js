// Imports
const ethers = await import("npm:ethers@6.10.0");

const apiUrl = args[0];

const response = await Functions.makeHttpRequest({
  url: apiUrl,
  method: "GET",
  timeout: 9000,
});

if (response.error) {
  throw Error(`API request failed: ${response.message}`);
}

//data needed:
/*
uint256 adjustedOffchainReserveUSD;
bool reserveValid;
uint256 updatedAt;
bytes32 attestationHash;
*/

const types = ["uint256", "bool", "uint256", "bytes32"];
const adjUSD = response.data.adjustedOffchainReserveUSD18 || "0";
const reserveValid = response.data.reserveValid || false;
const updatedAt = response.data.updatedAt || 0;
const attestationHash = response.data.attestationHash || ethers.ZeroHash;

//ABI encoding
const encoded = ethers.AbiCoder.defaultAbiCoder().encode(types, [
  adjUSD,
  reserveValid,
  updatedAt,
  attestationHash,
]);

// return the encoded data as Uint8Array
return ethers.getBytes(encoded);
