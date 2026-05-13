# Contracts Package

Solidity contracts, compiled artifacts, deployment metadata, and generated TypeScript exports for the RWA demo.

## Networks

Sepolia is the canonical issuing chain.

Polygon Amoy is the destination-chain representation network.

Current deployment JSON:

- `deployments/sepolia.json`
- `deployments/amoy.json`

## Deployed Addresses

Sepolia:

- MockUSDC: [0x6e3AD7B665ca85CD33A37fb6a3e232Bc38d66097](https://sepolia.etherscan.io/address/0x6e3AD7B665ca85CD33A37fb6a3e232Bc38d66097)
- MockReserveOracle: [0x9bb858CAa29b749acFB6843065D823e7EF41EE88](https://sepolia.etherscan.io/address/0x9bb858CAa29b749acFB6843065D823e7EF41EE88)
- ReserveOracle: [0xdE41e41bfc46E54a897eaEEB9e09384143Ee49bB](https://sepolia.etherscan.io/address/0xdE41e41bfc46E54a897eaEEB9e09384143Ee49bB)
- RWAToken: [0xA9F14a61F54f7485C5B6f329BE76ecA42B6A9A68](https://sepolia.etherscan.io/address/0xA9F14a61F54f7485C5B6f329BE76ecA42B6A9A68)
- RWAMintControllerVault: [0x27a51EC7b17c6d646E5acc067F0e82e904EbE77D](https://sepolia.etherscan.io/address/0x27a51EC7b17c6d646E5acc067F0e82e904EbE77D)
- RWATokenBridge: [0x43e23B5476990de7c208B382DA473d7E05aB3147](https://sepolia.etherscan.io/address/0x43e23B5476990de7c208B382DA473d7E05aB3147)
- LockReleaseTokenPool: [0xb0d86d541997465B3f8699D4558fe5e0fE21094D](https://sepolia.etherscan.io/address/0xb0d86d541997465B3f8699D4558fe5e0fE21094D)

Polygon Amoy:

- RWAToken: [0x74e0d105Af35ED6d4212c3647758903aa98236Ac](https://amoy.polygonscan.com/address/0x74e0d105Af35ED6d4212c3647758903aa98236Ac)
- RWATokenBridge: [0x33D1BD56C1725A17dE9F868FE2Fc1a4059e74cfC](https://amoy.polygonscan.com/address/0x33D1BD56C1725A17dE9F868FE2Fc1a4059e74cfC)
- BurnMintTokenPool: [0x42b1f7F33160D38620f4A51DE73Bdf7c6fC68d04](https://amoy.polygonscan.com/address/0x42b1f7F33160D38620f4A51DE73Bdf7c6fC68d04)

## Related Chainlink Tools

- CCIP Token Manager: https://test.tokenmanager.chain.link/dashboard/ethereum-testnet-sepolia,0xa9f14a61f54f7485c5b6f329be76eca42b6a9a68

## Main Contracts

- `MockUSDC`: test USDC used by the demo.
- `ReserveOracle`: Chainlink Functions-backed oracle that stores adjusted off-chain reserve data.
- `MockReserveOracle`: local/testing oracle retained in deployment metadata.
- `RWAMintControllerVault`: mints and redeems mTRWA using oracle reserve data and vault MockUSDC liquidity.
- `RWAToken`: ERC-20 mTRWA token.
- `RWATokenBridge`: CCIP sender contract used for cross-chain mTRWA movement.
- `LockReleaseTokenPool`: Sepolia token pool.
- `BurnMintTokenPool`: Amoy token pool.

## Generated TypeScript Exports

The frontend imports from:

```ts
import { contracts } from "@rwa/contracts";
```

or:

```ts
import { contracts } from "@rwa/contracts/generated";
```

The generated file is:

```txt
generated/index.ts
```

Regenerate after ABI, artifact, or deployment JSON changes:

```sh
pnpm contracts:generate
```

## Scripts

From the repository root:

```sh
pnpm contracts:generate
pnpm contracts:simulate:functions
pnpm contracts:source:copy
pnpm contracts:dev
```

From this directory:

```sh
pnpm generate
pnpm simulate:functions
pnpm source:copy
pnpm dev
```

`pnpm dev` runs `remixd`. After it starts, open https://remix.ethereum.org and connect Remix IDE to localhost. The `remixd` process is a local file tunnel that lets Remix read and edit this contracts package from the browser.

## Notes For Frontend Changes

- Do not hardcode contract ABIs in `apps/frontend`.
- Use the generated `contracts` object for addresses, ABIs, and chain IDs.
- If a contract function or event is renamed, update all frontend reads, writes, and event-sync logic.
