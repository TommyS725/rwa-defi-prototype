# RWA DeFi Prototype

Demo repository for an RWA tokenization prototype. The system connects an editable off-chain reserve report, an on-chain reserve oracle, a Sepolia mint/redeem vault, and CCIP token movement between Sepolia and Polygon Amoy.

## Live Services

- Frontend: https://rwa-defi-prototype.tommyshum.com/
- Oracle worker: https://oracle-worker.rwa-defi-prototype.tommyshum.com
- Oracle API: https://oracle-worker.rwa-defi-prototype.tommyshum.com/api/v1/reserve/latest
- Oracle admin: https://oracle-worker.rwa-defi-prototype.tommyshum.com/admin

## Workspace

- `apps/frontend`: Vite React TypeScript demo app for wallet connection, reserve dashboard, mint, redeem, bridge, faucet, allowance management, and metadata.
- `apps/oracle-worker`: Cloudflare Worker API and admin page for the off-chain reserve report.
- `packages/contracts`: Solidity contracts, compiled artifacts, deployment JSON, and generated TypeScript ABI/address exports.

## Deployed Contracts

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

CCIP Token Manager:

- https://test.tokenmanager.chain.link/dashboard/ethereum-testnet-sepolia,0xa9f14a61f54f7485c5b6f329be76eca42b6a9a68

## Quick Start

```sh
pnpm install
pnpm web:dev
```

Common commands:

```sh
pnpm web:build
pnpm oracle-worker:dev
pnpm oracle-worker:deploy
pnpm contracts:generate
pnpm format
```

## Demo Flow

1. Open the frontend dashboard.
2. Open the worker admin page and edit the off-chain reserve report.
3. Refresh the API data in the frontend.
4. If the API attestation hash differs from the on-chain oracle hash, call `ReserveOracle.requestReserveUpdate()` from the Home page.
5. Mint mTRWA with Sepolia MockUSDC.
6. Redeem MockUSDC with mTRWA.
7. Bridge mTRWA between Sepolia and Polygon Amoy through the deployed CCIP bridge contracts.

## Deployment

GitHub Actions deploy:

- Oracle worker: `.github/workflows/deploy-oracle-worker.yml`
- Frontend GitHub Pages: `.github/workflows/deploy-frontend-pages.yml`

The frontend workflow builds `apps/frontend/dist` and deploys it to GitHub Pages. `apps/frontend/public/CNAME` is copied by Vite into the build output, so the custom domain is deployed with the site.

Required frontend GitHub Actions variables/secrets are listed in `apps/frontend/.env.example`. Store `VITE_REOWN_PROJECT_ID` as a GitHub Secret. Store the other public Vite values as GitHub Actions Variables.

## Documentation

- [Agent Guide](./AGENTS.md)
- [Frontend README](./apps/frontend/README.md)
- [Oracle Worker README](./apps/oracle-worker/README.md)
- [Contracts README](./packages/contracts/README.md)
- [Architecture](./docs/architecture.md)
- [Environment](./docs/environment.md)
- [Deployment](./docs/deployment.md)
- [Agent Coding Guide](./docs/agent-coding-guide.md)
