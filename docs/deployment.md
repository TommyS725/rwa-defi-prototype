# Deployment

## Frontend

Live URL:

```txt
https://rwa-defi-prototype.tommyshum.com/
```

Workflow:

```txt
.github/workflows/deploy-frontend-pages.yml
```

The workflow:

1. Runs on pushes to `main` that affect the frontend, contracts package, workspace package files, or the workflow.
2. Installs workspace dependencies with pnpm.
3. Runs `pnpm web:build`.
4. Uploads `apps/frontend/dist` as a GitHub Pages artifact.
5. Deploys through `actions/deploy-pages`.

The frontend build includes:

- `public/favicon.svg`
- `public/CNAME`
- `404.html` copied from `index.html` for client-side routing fallback

GitHub repository setting:

```txt
Settings -> Pages -> Source -> GitHub Actions
```

## Oracle Worker

Live URL:

```txt
https://oracle-worker.rwa-defi-prototype.tommyshum.com
```

Workflow:

```txt
.github/workflows/deploy-oracle-worker.yml
```

The workflow:

1. Runs on pushes to `main` that affect `apps/oracle-worker`.
2. Installs the worker workspace dependencies.
3. Deploys with `cloudflare/wrangler-action`.

Required secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

## Contracts With Remix

The contracts package is set up for Remix IDE through `remixd`.

From the repository root:

```sh
pnpm contracts:dev
```

Or from `packages/contracts`:

```sh
pnpm dev
```

Then open https://remix.ethereum.org and connect Remix IDE to localhost. Remix will read the local `packages/contracts` files through the `remixd` tunnel.

Typical Remix deployment flow:

1. Open the desired contract under `packages/contracts/contracts`.
2. Compile with the Solidity compiler version selected by Remix.
3. In "Deploy & Run Transactions", choose "Injected Provider - MetaMask".
4. Switch MetaMask to the target testnet, usually Sepolia or Polygon Amoy.
5. Select the contract and provide constructor arguments.
6. Deploy and confirm the transaction in MetaMask.
7. Copy the deployed address into `packages/contracts/deployments/*.json`.
8. Run `pnpm contracts:generate` so the frontend receives the updated generated address exports.
9. Run `pnpm web:build` to verify the frontend still typechecks against the updated contract metadata.

## Local Checks Before Deploy

```sh
pnpm format
pnpm web:build
```

For worker changes:

```sh
pnpm oracle-worker:dev
```

For contract deployment metadata or ABI changes:

```sh
pnpm contracts:generate
pnpm web:build
```
