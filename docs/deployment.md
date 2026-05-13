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
