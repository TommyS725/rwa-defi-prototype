# AGENTS.md

Instructions for coding agents working in this repository.

## Scope

This file applies to the whole repository.

## Priorities

- Keep changes scoped to the user request.
- Prefer existing project patterns over new abstractions.
- Do not edit generated artifacts unless the task requires regeneration.
- Do not hardcode frontend contract ABIs. Import generated ABIs and addresses from `@rwa/contracts`.
- Do not commit secrets or local `.env` files.
- Use `pnpm` from the workspace root.

## Project Map

- `apps/frontend`: client-only Vite React app.
- `apps/oracle-worker`: Hono Cloudflare Worker with KV-backed reserve report.
- `packages/contracts`: Solidity contracts, deployment JSON, generated TypeScript exports.
- `docs`: shared documentation for architecture, deployment, environment, and agent workflow.

## Frontend Rules

- Keep the frontend pure client-side. Do not add backend/server logic to `apps/frontend`.
- Use TypeScript, React, TanStack Router, TanStack Query, shadcn-style UI components, Reown AppKit, wagmi, and viem.
- Use bigint-safe token math. Do not use floating point for token amounts.
- Use `parseUnits`/`formatUnits` through local formatting helpers.
- MockUSDC uses 6 decimals. mTRWA decimals should be read from token contract when needed.
- USD reserve and NAV values are USD18.
- For contract writes that should refresh reads, use `useContractTransaction().writeAndInvalidateQueries(...)`.
- For transaction errors, show a short error state with a details dialog instead of dumping the full error inline.

## Contract Rules

- Preserve deployed contract addresses in `packages/contracts/deployments/*.json`.
- Generated frontend exports come from `packages/contracts/scripts/generate-types.ts`.
- If artifacts or deployments change, run `pnpm contracts:generate`.
- Avoid changing ABI shapes without checking all frontend reads/writes that consume them.

## Oracle Worker Rules

- Keep the worker deployable to Cloudflare Workers.
- CORS is intentionally open for demo frontend access.
- Reserve report changes should preserve the JSON shape consumed by Chainlink Functions and the frontend.
- Do not put admin secrets into the repository.

## Verification

Run the smallest relevant check:

- Frontend changes: `pnpm web:build`
- Formatting-only or TypeScript frontend changes: `pnpm format && pnpm web:build`
- Contract generated export changes: `pnpm contracts:generate && pnpm web:build`
- Worker changes: `pnpm --filter @rwa/oracle-worker deploy --dry-run` when available, or at least inspect TypeScript and run locally with `pnpm oracle-worker:dev`.

## Git Safety

- The worktree may contain user changes. Do not revert unrelated changes.
- Avoid destructive git commands unless the user explicitly asks.
- If rewriting history, confirm the target commits and verify the worktree before and after.
