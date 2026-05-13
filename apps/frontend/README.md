# mTRWA Frontend

Pure client-side Vite React app for demonstrating the RWA tokenization prototype.

Live site: https://rwa-defi-prototype.tommyshum.com/

## Features

- Reserve dashboard with worker API data and on-chain oracle data.
- Attestation-hash reminder showing when the on-chain oracle can be updated.
- Sepolia MockUSDC faucet.
- Mint mTRWA with MockUSDC on Sepolia.
- Redeem MockUSDC with mTRWA on Sepolia.
- Bridge mTRWA between Sepolia and Polygon Amoy with CCIP.
- Manage ERC-20 allowances for controller and bridge spenders.
- Metadata page with deployed addresses and explorer links.

## Stack

- Vite, React, TypeScript
- TanStack Router
- TanStack Query
- shadcn-style local UI components
- Reown AppKit
- wagmi and viem
- `@rwa/contracts` generated ABI/address exports

## Commands

From the repository root:

```sh
pnpm web:dev
pnpm web:build
```

From this directory:

```sh
pnpm dev
pnpm build
pnpm preview
```

The build copies `dist/index.html` to `dist/404.html` so GitHub Pages can serve client-side routes directly.

## Environment

Copy `.env.example` to `.env` for local development.

Required:

- `VITE_REOWN_PROJECT_ID`
- `VITE_ORACLE_WORKER_URL`
- `VITE_SEPOLIA_CCIP_SELECTOR`
- `VITE_AMOY_CCIP_SELECTOR`
- `VITE_SEPOLIA_EXPLORER_URL`
- `VITE_AMOY_EXPLORER_URL`
- `VITE_CCIP_EXPLORER_URL`
- `VITE_MTRWA_CCIP_TOKEN_MANAGER_URL`

Optional:

- `VITE_GITHUB_REPO_URL`

For GitHub Pages, store `VITE_REOWN_PROJECT_ID` as a GitHub Secret. Store the other public Vite values as GitHub Actions Variables.

## Contract Data

Do not hardcode ABIs in this app. Import contract ABIs and addresses from `@rwa/contracts`.

If contracts, deployments, or generated outputs change:

```sh
pnpm contracts:generate
pnpm web:build
```

## Notes

- The app is a demo UI, not a production wallet.
- All contract interaction is client-side.
- Query refresh after writes should use `writeAndInvalidateQueries`, which waits for the transaction receipt before invalidating TanStack Query data.
