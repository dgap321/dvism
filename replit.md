# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **SQLite**: Node 24 built-in `node:sqlite` (DatabaseSync) — no external package needed
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (ESM bundle)

## Artifacts

### DB Editor (react-vite, previewPath: `/`)
A web app for viewing, editing, and deleting records from the Bhishma SQLite database.

- **Frontend**: `artifacts/db-editor/` — React + Vite + Tailwind, tabs for Items/Kits/Inventory
- **Backend**: `artifacts/api-server/` — Express 5 with `node:sqlite` reading `src/bhishma.db`
- **SQLite DB**: `artifacts/api-server/src/bhishma.db` — copied from `attached_assets/`

### API Routes
- `GET /api/items` — list all items (EnglishMotherCube)
- `PATCH /api/items/:id` — update itemName/itemQty
- `DELETE /api/items/:id` — delete item
- `GET /api/kits` — list distinct kits (grouped from EnglishMotherCube). Each kit row includes `kitExpiryDate` = `MIN(NULLIF(itemExpiryDate, ''))` across all items in that kit (auto-derived).
- `PATCH /api/kits/:kitId` — update kitName/kitQty
- `DELETE /api/kits/:kitId` — delete all rows for kit
- `GET /api/kits/:kitId/items` — list items inside a kit; each item includes `itemExpiryDate`
- `PATCH /api/items/:id` — supports `itemExpiryDate` (YYYY-MM-DD or empty to clear); changes are written to the changes log as `Edited Item Expiry`. Idempotent migration in `getDb()` and CSV import ensures the `itemExpiryDate` column exists in EnglishMotherCube and HindiMotherCube.
- `GET /api/inventory` — list MotherCuber3 items
- `PATCH /api/inventory/:id` — update ItemName/Qty
- `DELETE /api/inventory/:id` — delete inventory item
- `GET /api/export` — download the updated SQLite db file

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/api-server run build` — build API server
- `pnpm --filter @workspace/api-server run dev` — run API server locally
