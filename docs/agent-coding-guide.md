# Agent Coding Guide

This guide is for coding agents and future maintainers working on the repository.

## General Workflow

1. Inspect existing code before editing.
2. Keep changes scoped to the request.
3. Prefer repo conventions and local helpers.
4. Run the smallest useful verification command.
5. Report any checks that could not be run.

## Search And Editing

- Use `rg` or `rg --files` for search.
- Use `apply_patch` for manual file edits.
- Do not use shell write tricks for source files.
- Do not touch generated files unless regeneration is part of the task.

## Frontend Patterns

- Routes live in `apps/frontend/src/routes`.
- Reusable app components live in `apps/frontend/src/components`.
- shadcn-style primitives live in `apps/frontend/src/components/ui`.
- Contract addresses and ABIs come from `apps/frontend/src/lib/contracts.ts`, which imports `@rwa/contracts`.
- Chain metadata lives in `apps/frontend/src/lib/chains.ts`.
- Bigint-safe parsing and formatting lives in `apps/frontend/src/lib/format.ts`.

For contract writes that should refresh query data:

```ts
await tx.writeAndInvalidateQueries({
  address,
  abi,
  functionName,
  args,
  chainId,
});
```

This waits for the transaction receipt before invalidating TanStack Query data.

## Event Sync

Frontend event refresh is centralized in:

```txt
apps/frontend/src/components/ContractEventSync.tsx
```

It uses block polling and `getContractEvents` ranges instead of many `useWatchContractEvent` hooks. This avoids temporary RPC filter issues such as `filter not found`.

## Env Safety

- Never commit `.env`.
- Use `.env.example` for names and safe example values.
- Vite variables are public at runtime even if sourced from GitHub Secrets.
- `VITE_REOWN_PROJECT_ID` is stored as a GitHub Secret by convention.

## Contract Package

When changing artifacts or deployments:

```sh
pnpm contracts:generate
```

Then verify frontend type usage:

```sh
pnpm web:build
```

## Worker Package

The worker is Hono on Cloudflare Workers.

- Preserve CORS unless intentionally changing frontend access.
- Preserve `/api/v1/reserve/latest` response shape unless updating Chainlink Functions and frontend consumers together.
- KV binding name is `RWA_ORACLE_KV`.

## Formatting

Biome is configured at the repo root and applies to JS/TS/TSX files.

```sh
pnpm format
```

Biome also organizes imports and rejects unused imports. Run `pnpm format` before finishing frontend code changes so import sorting and cleanup are applied automatically.
