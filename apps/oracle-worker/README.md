# Oracle Worker

Cloudflare Worker that serves and edits the off-chain reserve report used by the RWA demo.

Live worker: https://oracle-worker.rwa-defi-prototype.tommyshum.com

## Endpoints

- `GET /health`: health check.
- `GET /admin`: HTML admin page for editing reserve inputs.
- `POST /admin/update`: form endpoint used by the admin page.
- `GET /api/v1/reserve/latest`: latest reserve report JSON.
- `GET /api/reserve/latest`: compatibility alias for latest reserve report JSON.

The worker enables open CORS so the deployed frontend and local frontend can read the API.

## Data Model

The reserve report includes:

- gross asset value
- liabilities
- fees
- adjusted off-chain reserve
- USD18 integer values
- validity flag
- note
- update timestamp
- attestation hash

The Chainlink Functions source in `packages/contracts/oracle/source.js` expects the latest reserve JSON shape to stay stable.

## Commands

From the repository root:

```sh
pnpm oracle-worker:dev
pnpm oracle-worker:deploy
```

From this directory:

```sh
pnpm dev
pnpm deploy
pnpm cf-typegen
```

## Cloudflare Resources

The worker uses a KV namespace bound as `RWA_ORACLE_KV`.

Configuration lives in `wrangler.jsonc`.

The Wrangler config controls both local development and deployment:

- `name`: deployed Worker name.
- `main`: Worker entry point.
- `compatibility_date`: Cloudflare Workers runtime compatibility date.
- `kv_namespaces[].binding`: must stay `RWA_ORACLE_KV` because the worker code reads that binding.
- `kv_namespaces[].id`: production KV namespace used by `wrangler deploy`.
- `kv_namespaces[].preview_id`: preview KV namespace used by `wrangler dev`.

For local development, `pnpm oracle-worker:dev` starts Wrangler with the preview KV namespace. The local frontend can point `VITE_ORACLE_WORKER_URL` at the local Wrangler URL, usually `http://localhost:8787`.

For deployment, authenticate Wrangler with Cloudflare before running `pnpm oracle-worker:deploy` locally. CI deploys through GitHub Actions with the Cloudflare account ID and API token listed below.

## GitHub Actions

Deployment workflow:

```txt
.github/workflows/deploy-oracle-worker.yml
```

Required repository secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
