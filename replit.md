# Botswana Hospital Medication Inventory

Responsive hospital-side medication inventory management for Botswana Ministry of Health teams, covering stock visibility, receiving, dispensing, alerts, chronic collections, replenishment, reports, and audit history.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/hospital-medication-inventory run dev` — run the web application
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/hospital-medication-inventory/src/App.tsx` — responsive application shell and workflow pages
- `artifacts/api-server/src/routes/inventory.ts` — dashboard, inventory, operations, alerts, chronic, replenishment, reports, and audit endpoints
- `lib/api-spec/openapi.yaml` — source of truth for the generated API client and Zod contracts
- `lib/db/src/schema/inventory.ts` — normalized medicines, batches, stock transactions, schedules, replenishment, and audit tables

## Architecture decisions

- Hospital inventory is modeled as medicine → batch → units so FEFO can deduct from the earliest eligible expiry without allowing expired stock.
- Stock-changing actions append immutable transactions and audit entries rather than overwriting history.
- Seed data is clearly dummy/demo data for Gaborone District Hospital and is created lazily when the API first needs data.
- Replenishment is a hospital-prepared request for CMS; the application does not model CMS distribution or warehouse operations.

## Product

The app gives hospital pharmacy and inventory staff a role-labelled operations console with live dashboard KPIs, stock and batch visibility, receiving conversion previews, FEFO dispensing, low-stock and expiry alerts, chronic collection scheduling, replenishment submission, consumption reporting, and read-only audit history.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
