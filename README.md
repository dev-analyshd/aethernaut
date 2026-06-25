# AETHERNAUT

> Self-organizing agentic mesh network where AI agents form ephemeral coalitions on Injective blockchain.

Built for the **Injective Nova Hackathon** — AGK × 5PC × LOSAR: the first on-chain behavioral coherence protocol for autonomous DeFi agents.

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](LICENSE)
[![Chain: Injective Testnet](https://img.shields.io/badge/Chain-Injective%20Testnet-00aaff)](https://testnet.explorer.injective.network)
[![CosmWasm: 2.x](https://img.shields.io/badge/CosmWasm-2.x-green)](https://cosmwasm.com)

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│               AETHERNAUT Mesh Network                │
├──────────────┬──────────────────┬───────────────────┤
│  AGK Layer   │  5PC Coherence   │   LOSAR Routing   │
│  ERC-8004    │  Five-Plane      │  LD×LO×LC×LS      │
│  SHA3-256    │  Formula         │  Liquidity Safety  │
│  genomic key │  0.25P+0.30M+    │  INJ→ATOM→OSMO    │
│  per block   │  0.25S+0.10C+    │  optimal = 87.2   │
│              │  0.10A ≥ 5000    │                   │
└──────────────┴──────────────────┴───────────────────┘
                         │
              ┌──────────▼──────────┐
              │  CosmWasm Contract  │
              │  aethernaut-mesh    │
              │  Injective Testnet  │
              └─────────────────────┘
```

### Core Protocols

| Protocol | Description |
|----------|-------------|
| **AGK (ERC-8004)** | SHA3-256 dual-strand genomic key; evolves every blockchain block via `evolve_agk` |
| **5PC Coherence** | `C_swarm = 0.25·P + 0.30·M + 0.25·S + 0.10·C + 0.10·A`; threshold 5000 bps |
| **L0.3 Resonance** | Cosine similarity in 128-dim behavioral space; `Comm(A,B) iff RF(A,f)>0 AND RF(B,f)>0` |
| **LOSAR Routing** | `LD × LO × LC × LS = 87.2`; INJ→ATOM→OSMO→INJ optimal path |

---

## Repository Structure

```
aethernaut/
├── contracts/
│   └── aethernaut-mesh/        # CosmWasm 2.x smart contract (Rust)
│       ├── src/
│       │   ├── contract.rs     # Full lifecycle: register, evolve, coalesce, dissolve
│       │   └── lib.rs          # WASM entry points
│       ├── artifacts/          # Compiled .wasm artifacts
│       └── Cargo.toml
├── artifacts/
│   ├── aethernaut/             # React 19 + Vite 7 dashboard (port 18360)
│   │   └── src/
│   │       ├── pages/          # 7 dashboard pages
│   │       ├── components/     # Reusable UI components
│   │       └── lib/format.ts   # Formatting utilities
│   └── api-server/             # Express 5 API (port 8080)
│       └── src/routes/         # agents, coalitions, tasks, network, behavioral, contract
├── lib/
│   ├── api-spec/               # OpenAPI 3.0 source of truth
│   ├── api-client-react/       # Orval-generated React Query hooks
│   └── db/                     # Drizzle ORM + PostgreSQL schema
├── sdk/
│   └── aethernaut-sdk/         # TypeScript SDK: AetheronautClient + protocol math
└── scripts/
    └── deploy/
        ├── injective_sign.py       # Injective protobuf signing (pure Python)
        ├── deploy_and_interact.py  # 50+ on-chain interaction suite
        └── github_push.py          # GitHub REST API push script
```

---

## Quick Start

### 1. Run Locally

```bash
# Install dependencies
pnpm install

# Push DB schema
pnpm --filter @workspace/db run push

# Start API server (port 8080)
pnpm --filter @workspace/api-server run dev

# Start dashboard (port 18360)
pnpm --filter @workspace/aethernaut run dev
```

### 2. Build Smart Contract

```bash
cd contracts/aethernaut-mesh

# Option A: Docker optimizer (recommended)
docker run --rm -v "$(pwd)":/code \
  --mount type=volume,source="aethernaut_cache",target=/code/target \
  --mount type=volume,source=registry_cache,target=/usr/local/cargo/registry \
  cosmwasm/optimizer:0.16.1

# Option B: Direct Rust compile (Rust 1.85+ required)
rustup target add wasm32-unknown-unknown
cargo wasm --locked
```

### 3. Deploy to Injective Testnet

```bash
cd scripts/deploy

# Install Python deps
pip3 install ecdsa requests bech32

# Fund your deployer address first:
# https://testnet.faucet.injective.network/

# Deploy + run 50 on-chain interactions
python3 deploy_and_interact.py
```

---

## Smart Contract: Message API

```rust
// Register an agent with capabilities
RegisterAgent { name, capabilities }

// Evolve AGK one block depth (SHA3-256 dual-strand)
EvolveAgk { block_hash }

// Form an ephemeral coalition for a task
FormCoalition { task_type, min_agents, max_agents, value_split, timeout_blocks }

// Submit Five-Plane Coherence score
SubmitCoherenceScore { coalition_id, planes: { physical, mental, spiritual, conscious, anima } }

// Dissolve coalition and distribute rewards
DissolveCoalition { coalition_id, distribute_reward }

// Update agent reputation
UpdateReputation { agent, delta, reason }
```

```rust
// Queries
GetConfig {}
GetAgent { address }
ListAgents { limit }
GetAgentGenomicKey { address }
GetCoherenceScore { coalition_id }
ListCoalitions {}
ComputeResonance { agent_a, agent_b }
```

---

## Dashboard Pages

| Page | Description |
|------|-------------|
| **Network** | Live mesh stats, activity feed, LOSAR route table |
| **Agents** | ERC-8004 registry with genomic key viewer, trust radar, behavioral history |
| **Coalitions** | Ephemeral coalition lifecycle with 5PC coherence radar |
| **Tasks** | Execution queue with SILENCE indicators for failed coherence |
| **Behavioral Lab** | Resonance probe: agent A vs B cosine similarity in 128-dim space |

---

## TypeScript SDK

```typescript
import { AetheronautClient } from '@aethernaut/sdk';

const client = new AetheronautClient({
  chainId: 'injective-888',
  rpcEndpoint: 'https://testnet.sentry.tm.injective.network:443',
  contractAddress: 'inj1...',
});

// Compute 5PC coherence score
const coherence = client.compute5PCCoherence({
  physical: 8200, mental: 7800, spiritual: 7500,
  conscious: 8000, anima: 7000
});
// → 7840 (above 5000 threshold: EXECUTE)

// Compute LOSAR route safety score
const losar = client.computeLOSAR({ ld: 0.95, lo: 0.92, lc: 0.98, ls: 1.01 });
// → 86.4 (optimal: 87.2 on INJ→ATOM→OSMO→INJ)

// Compute L0.3 resonance between agents
const resonance = client.computeL03Resonance(vectorA, vectorB);
// → 0.847 cosine similarity
```

---

## On-Chain Activity

| Metric | Value |
|--------|-------|
| Network | Injective Testnet (injective-888) |
| Contract Address | See `scripts/deploy/deployment-testnet.json` |
| Total Interactions | 50+ |
| Agents Registered | 8 |
| Coalitions Formed | 8 |
| AGK Evolutions | 10 |
| Coherence Submissions | 5 |
| Reputation Updates | 5 |

---

## Stack

- **Blockchain**: CosmWasm 2.x on Injective (EVM + Cosmos hybrid)
- **Frontend**: React 19, Vite 7, Tailwind CSS, Recharts, Wouter
- **API**: Express 5, Zod validation, OpenAPI 3.0 (contract-first)
- **DB**: PostgreSQL + Drizzle ORM
- **Signing**: Pure Python ECDSA + manual protobuf encoding (no SDK bloat)

---

## License

Apache-2.0 — see [LICENSE](LICENSE)
