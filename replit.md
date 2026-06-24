# AETHERNAUT

Self-organizing agentic mesh network where AI agents form ephemeral coalitions on Injective blockchain.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/aethernaut run dev` — run the dashboard (port 18360)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- **Frontend**: React 19, Vite 7, Tailwind CSS, Recharts, Wouter
- **API**: Express 5, Zod validation, OpenAPI spec → Orval codegen
- **DB**: PostgreSQL + Drizzle ORM
- **Contract**: CosmWasm 2.1 (Rust), Injective-compatible
- **SDK**: `sdk/aethernaut-sdk/` TypeScript SDK

## Where things live

- `artifacts/aethernaut/src/pages/` — all 7 dashboard pages
- `artifacts/aethernaut/src/components/layout/AppLayout.tsx` — sidebar nav
- `artifacts/api-server/src/routes/` — all API route handlers
- `lib/db/src/schema/` — Drizzle schema (agents, coalitions, tasks, behavioral)
- `lib/api-spec/openapi.yaml` — source of truth for API contract
- `lib/api-client-react/src/generated/` — Orval-generated hooks
- `contracts/aethernaut-mesh/src/contract.rs` — CosmWasm smart contract
- `sdk/aethernaut-sdk/src/index.ts` — TypeScript SDK
- `artifacts/aethernaut/src/lib/format.ts` — shared formatting utilities
- `artifacts/aethernaut/src/index.css` — dark space theme (cyan/violet palette)

## Architecture decisions

- **Contract-first API**: OpenAPI spec is source of truth; Orval generates all hooks/types
- **AGK (ERC-8004)**: SHA3-256 dual-strand genomic key evolving per block depth
- **5PC Coherence**: Five-Plane formula (0.25·Physical + 0.30·Mental + 0.25·Spiritual + 0.10·Conscious + 0.10·ANIMA)
- **LOSAR routing**: LD × LO × LC × LS = liquidity safety score; optimal = INJ→ATOM→OSMO→INJ at 87.2
- **L0.3 Resonance**: Cosine similarity in 128-dim behavioral space; Comm(A,B) iff ∃f: RF(A,f) > 0 AND RF(B,f) > 0
- **No query params on spec endpoints** — Orval generates conflicting type names (GetXParams collision) when path params + query params coexist

## Product

AETHERNAUT is a mesh control center for autonomous AI agents. Agents:
1. Register with a unique genomic key (AGK) that evolves every blockchain block
2. Discover compatible peers via behavioral resonance (L0.3 cosine protocol)
3. Form ephemeral coalitions for specific DeFi tasks (arbitrage, MEV resistance, governance)
4. Execute only if Five-Plane Coherence (5PC) exceeds threshold — otherwise emit SILENCE
5. Dissolve and redistribute rewards proportionally

Dashboard pages:
- **Network** — live mesh stats, activity feed, LOSAR route table
- **Agents** — ERC-8004 registry with genomic key viewer, trust radar, behavioral history
- **Coalitions** — ephemeral coalition lifecycle with 5PC coherence radar
- **Tasks** — execution queue with SILENCE indicators for failed coherence
- **Behavioral Lab** — resonance probe (agent A vs B cosine similarity)

## User preferences

- GitHub repo: https://github.com/dev-analyshd/aethernaut (owner: dev-analyshd)
- GITHUB_TOKEN stored as Replit secret
- Dark space theme: `--background: 230 25% 6%`, `--primary: 185 100% 50%` (electric cyan), `--secondary: 275 80% 60%` (violet)

## Gotchas

- **Do NOT add query params to OpenAPI spec endpoints that have path params** — causes TS2308 collision in Orval output (GetXParams exported from both api.ts and types.ts)
- API server binds port 8080 (not 5000) in production; check artifact.toml
- Frontend port is 18360 (set in artifact.toml + workflow env)
- DB schema push: `pnpm --filter @workspace/db run push` (not drizzle-kit directly)
- AGK hash in API is computed with Node crypto (SHA-256 approximation) — contract uses actual SHA3-256

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- Contract: `contracts/aethernaut-mesh/src/contract.rs` — full CosmWasm lifecycle
- SDK: `sdk/aethernaut-sdk/src/index.ts` — AetheronautClient + protocol math helpers
