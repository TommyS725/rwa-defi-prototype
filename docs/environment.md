# Environment

## Frontend

Local frontend env file:

```txt
apps/frontend/.env
```

Example:

```txt
VITE_REOWN_PROJECT_ID=
VITE_ORACLE_WORKER_URL=https://oracle-worker.rwa-defi-prototype.tommyshum.com
VITE_SEPOLIA_CCIP_SELECTOR=16015286601757825753
VITE_AMOY_CCIP_SELECTOR=16281711391670634445
VITE_SEPOLIA_EXPLORER_URL=https://sepolia.etherscan.io
VITE_AMOY_EXPLORER_URL=https://amoy.polygonscan.com
VITE_CCIP_EXPLORER_URL=https://ccip.chain.link
VITE_MTRWA_CCIP_TOKEN_MANAGER_URL=https://test.tokenmanager.chain.link/dashboard/ethereum-testnet-sepolia,0xa9f14a61f54f7485c5b6f329be76eca42b6a9a68
VITE_GITHUB_REPO_URL=
```

The frontend validates required env vars at startup.

## GitHub Pages Variables

Store as GitHub Actions Variables:

- `VITE_ORACLE_WORKER_URL`
- `VITE_SEPOLIA_CCIP_SELECTOR`
- `VITE_AMOY_CCIP_SELECTOR`
- `VITE_SEPOLIA_EXPLORER_URL`
- `VITE_AMOY_EXPLORER_URL`
- `VITE_CCIP_EXPLORER_URL`
- `VITE_MTRWA_CCIP_TOKEN_MANAGER_URL`
- `VITE_GITHUB_REPO_URL`

Store as GitHub Actions Secret:

- `VITE_REOWN_PROJECT_ID`

The Reown project ID is still embedded into the built browser app because Vite env values are compile-time public values. Keeping it as a secret avoids exposing it in repository settings and keeps the workflow safer by default.

## Oracle Worker

Cloudflare Worker configuration:

```txt
apps/oracle-worker/wrangler.jsonc
```

KV binding:

```txt
RWA_ORACLE_KV
```

GitHub Actions deployment secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
