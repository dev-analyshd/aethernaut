/**
 * AETHERNAUT TypeScript SDK
 * Self-organizing agentic mesh network on Injective
 *
 * ERC-8004: Agent Genomic Key (AGK) — behavioral identity protocol
 * 5PC: Five-Plane Coherence — coalition consensus mechanism
 * LOSAR: Liquidity Ocean Score for Agent Routing
 * L0.3: Resonance-based communication protocol
 */

import { createHash } from "crypto";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AgentStatus = "active" | "in_coalition" | "idle" | "offline";
export type CoalitionStatus = "forming" | "active" | "executing" | "dissolved" | "timed_out";
export type TaskType =
  | "cross-chain-arbitrage"
  | "liquidity-migration"
  | "mev-resistance"
  | "governance-vote"
  | "regulatory-adapt";

export interface Agent {
  id: string;
  name: string;
  address: string;
  status: AgentStatus;
  capabilities: string[];
  reputationScore: number;
  genomicDepth: number;
  coalitionsFormed: number;
  tasksCompleted: number;
  resonanceThreshold: number;
  createdAt: string;
  lastActiveAt: string;
}

export interface AgentGenomicKey {
  agentId: string;
  currentHash: string;
  depth: number;
  lastEvolution: string;
  senseStrand: string;
  antisenseStrand: string;
  isVerified: boolean;
}

export interface CoherencePlanes {
  physical: number;  // 0-1 — on-chain transaction entropy
  mental: number;    // 0-1 — strategic decision alignment
  spiritual: number; // 0-1 — long-term mission coherence
  conscious: number; // 0-1 — real-time network awareness
  anima: number;     // 0-1 — ANIMA: emergent collective consciousness
}

export interface Coalition {
  id: string;
  taskType: string;
  status: CoalitionStatus;
  memberCount: number;
  minAgents: number;
  maxAgents: number;
  formationTrust: number;
  coherenceScore: number | null;
  totalRewardDistributed: number | null;
  valueSplit: string;
  createdAt: string;
  dissolvedAt: string | null;
}

export interface LosarRoute {
  route: string;
  losarScore: number;  // LD × LO × LC × LS
  liquidityDepth: number;
  sybildResistance: number;
  stressRatio: number;
  manipulationScore: number;
  isOptimal: boolean;
}

export interface ResonanceResult {
  agentAId: string;
  agentBId: string;
  resonanceScore: number;
  canCommunicate: boolean;
  sharedFrequencies: number;
  dimensionScores: Record<string, number>;
}

// ─── ERC-8004: Agent Genomic Key ──────────────────────────────────────────────

/**
 * Compute the Agent Genomic Key for a given agent address and block data.
 * AGK evolves with every Injective block, providing temporal behavioral identity.
 *
 * Protocol:
 *   SENSE    = SHA3-256(address || block_hash || depth || 0x00)
 *   ANTISENSE = SHA3-256(address || block_hash || depth || 0xFF)
 *   HASH     = SHA3-256(SENSE || ANTISENSE)
 */
export function computeAgk(
  agentAddress: string,
  blockHash: string,
  depth: number
): { hash: string; senseStrand: string; antisenseStrand: string } {
  const data = `${agentAddress}:${blockHash}:${depth}`;

  const senseStrand = createHash("sha3-256")
    .update(data)
    .update(Buffer.from([0x00]))
    .digest("hex");

  const antisenseStrand = createHash("sha3-256")
    .update(data)
    .update(Buffer.from([0xff]))
    .digest("hex");

  const hash = createHash("sha3-256")
    .update(senseStrand)
    .update(antisenseStrand)
    .digest("hex");

  return { hash, senseStrand, antisenseStrand };
}

/**
 * Verify an AGK against known agent data. Returns true if the hash is consistent.
 */
export function verifyAgk(
  agentAddress: string,
  blockHash: string,
  depth: number,
  expectedHash: string
): boolean {
  const { hash } = computeAgk(agentAddress, blockHash, depth);
  return hash === expectedHash;
}

// ─── 5PC: Five-Plane Coherence ────────────────────────────────────────────────

const DEFAULT_WEIGHTS: CoherencePlanes = {
  physical: 0.25,
  mental: 0.30,
  spiritual: 0.25,
  conscious: 0.10,
  anima: 0.10,
};

/**
 * Compute the 5PC score for a coalition.
 * C_swarm = Σ(w_i · P_i) where planes are normalized [0,1].
 *
 * Formula: C_swarm = 0.25·Physical + 0.30·Mental + 0.25·Spiritual + 0.10·Conscious + 0.10·ANIMA
 *
 * If C_swarm ≥ Θ_swarm (threshold), coalition is ACTIONABLE.
 * If C_swarm < Θ_swarm, SILENCE is emitted — no action taken.
 */
export function computeCoherenceScore(
  planes: CoherencePlanes,
  weights: CoherencePlanes = DEFAULT_WEIGHTS
): number {
  return (
    planes.physical * weights.physical +
    planes.mental * weights.mental +
    planes.spiritual * weights.spiritual +
    planes.conscious * weights.conscious +
    planes.anima * weights.anima
  );
}

export function isActionable(coherenceScore: number, threshold: number): boolean {
  return coherenceScore >= threshold;
}

// ─── L0.3: Behavioral Resonance Protocol ──────────────────────────────────────

/**
 * Compute cosine similarity between two behavioral vectors.
 * Used for the L0.3 Resonance Communication Condition:
 *   Comm(A,B) iff ∃f : RF(A,f) > 0 AND RF(B,f) > 0
 */
export function computeCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) throw new Error("Vectors must have equal dimensions");
  const dot = vecA.reduce((s, v, i) => s + v * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((s, v) => s + v * v, 0));
  const magB = Math.sqrt(vecB.reduce((s, v) => s + v * v, 0));
  return magA && magB ? dot / (magA * magB) : 0;
}

/**
 * Convert an agent to a normalized behavioral vector for resonance computation.
 * Dimensions: [reputation, genomic_depth, coalitions, tasks, ...]
 */
export function agentToBehavioralVector(agent: Pick<Agent, "reputationScore" | "genomicDepth" | "coalitionsFormed" | "tasksCompleted">): number[] {
  return [
    agent.reputationScore / 100,
    Math.min(1, agent.genomicDepth / 15000),
    Math.min(1, agent.coalitionsFormed / 50),
    Math.min(1, agent.tasksCompleted / 150),
  ];
}

// ─── LOSAR: Liquidity Ocean Score for Agent Routing ───────────────────────────

/**
 * Compute the LOSAR score for a given route.
 * LOSAR = LD × LO × LC × LS
 *   LD = Liquidity Depth score
 *   LO = Liquidity Optimization (Sybil resistance proxy)
 *   LC = Liquidity Consistency (stress ratio)
 *   LS = Liquidity Safety (1 - manipulation score)
 */
export function computeLosarScore(
  liquidityDepth: number,
  sybildResistance: number,
  stressRatio: number,
  manipulationScore: number
): number {
  const ls = 1 - manipulationScore;
  return liquidityDepth * sybildResistance * stressRatio * ls;
}

/**
 * Rank routes by LOSAR score and return the optimal route.
 */
export function findOptimalRoute(routes: LosarRoute[]): LosarRoute | null {
  if (!routes.length) return null;
  return routes.reduce((best, r) => r.losarScore > best.losarScore ? r : best);
}

// ─── AETHERNAUT Client ────────────────────────────────────────────────────────

export interface AetheronautClientOptions {
  baseUrl: string;
  apiKey?: string;
}

/**
 * AETHERNAUT HTTP client for the REST API.
 */
export class AetheronautClient {
  private baseUrl: string;
  private headers: HeadersInit;

  constructor(options: AetheronautClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.headers = {
      "Content-Type": "application/json",
      ...(options.apiKey ? { Authorization: `Bearer ${options.apiKey}` } : {}),
    };
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: { ...this.headers, ...init?.headers },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`AETHERNAUT API error ${res.status}: ${body}`);
    }
    return res.json() as Promise<T>;
  }

  // Agents
  listAgents(): Promise<Agent[]> {
    return this.request("/api/agents");
  }

  getAgent(id: string): Promise<Agent> {
    return this.request(`/api/agents/${id}`);
  }

  registerAgent(data: { name: string; address: string; capabilities: string[] }): Promise<Agent> {
    return this.request("/api/agents", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  getAgentGenomicKey(id: string): Promise<AgentGenomicKey> {
    return this.request(`/api/agents/${id}/genomic-key`);
  }

  getAgentTrustScore(id: string): Promise<unknown> {
    return this.request(`/api/agents/${id}/trust-score`);
  }

  // Coalitions
  listCoalitions(): Promise<Coalition[]> {
    return this.request("/api/coalitions");
  }

  getCoalition(id: string): Promise<Coalition> {
    return this.request(`/api/coalitions/${id}`);
  }

  formCoalition(data: {
    taskType: string;
    minAgents: number;
    maxAgents: number;
    valueSplit?: string;
    seedAgentId?: string;
  }): Promise<Coalition> {
    return this.request("/api/coalitions", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  dissolveCoalition(id: string): Promise<Coalition> {
    return this.request(`/api/coalitions/${id}/dissolve`, { method: "POST" });
  }

  getCoherenceScore(coalitionId: string): Promise<{ totalScore: number; threshold: number; isActionable: boolean; planes: CoherencePlanes }> {
    return this.request(`/api/behavioral/coherence/${coalitionId}`);
  }

  // Network
  getNetworkStats(): Promise<unknown> {
    return this.request("/api/network/stats");
  }

  getLosarRoutes(): Promise<LosarRoute[]> {
    return this.request("/api/network/losar");
  }

  // Behavioral Lab
  computeResonance(agentAId: string, agentBId: string): Promise<ResonanceResult> {
    return this.request("/api/behavioral/resonance", {
      method: "POST",
      body: JSON.stringify({ agentAId, agentBId }),
    });
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export default AetheronautClient;
