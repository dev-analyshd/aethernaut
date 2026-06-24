import { Router } from "express";
import { db } from "@workspace/db";
import { agentsTable, coalitionsTable, coalitionMembersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function cosineSim(a: number[], b: number[]): number {
  const dot = a.reduce((s, v, i) => s + v * b[i], 0);
  const magA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
  const magB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
  return magA && magB ? dot / (magA * magB) : 0;
}

function agentToVector(agent: { reputationScore: number; genomicDepth: number; coalitionsFormed: number; tasksCompleted: number }): number[] {
  return [
    agent.reputationScore / 100,
    Math.min(1, agent.genomicDepth / 10000),
    Math.min(1, agent.coalitionsFormed / 20),
    Math.min(1, agent.tasksCompleted / 50),
    0.5 + Math.random() * 0.5,
    0.5 + Math.random() * 0.5,
  ];
}

router.post("/behavioral/resonance", async (req, res) => {
  const { agentAId, agentBId } = req.body;
  if (!agentAId || !agentBId) {
    res.status(400).json({ error: "agentAId and agentBId required" });
    return;
  }

  const [agentA] = await db.select().from(agentsTable).where(eq(agentsTable.id, agentAId));
  const [agentB] = await db.select().from(agentsTable).where(eq(agentsTable.id, agentBId));

  if (!agentA || !agentB) {
    res.status(404).json({ error: "One or both agents not found" });
    return;
  }

  const vecA = agentToVector(agentA);
  const vecB = agentToVector(agentB);
  const resonanceScore = cosineSim(vecA, vecB);
  const sharedFrequencies = vecA.filter((v, i) => Math.abs(v - vecB[i]) < 0.2).length;

  res.json({
    agentAId,
    agentBId,
    resonanceScore,
    canCommunicate: resonanceScore > 0,
    sharedFrequencies,
    dimensionScores: {
      transactionEntropy: Math.abs(vecA[0] - vecB[0]) < 0.2 ? 0.8 : 0.4,
      liquidityConsistency: Math.abs(vecA[1] - vecB[1]) < 0.2 ? 0.75 : 0.35,
      crossChainBreadth: Math.abs(vecA[2] - vecB[2]) < 0.3 ? 0.7 : 0.3,
      governanceQuality: Math.abs(vecA[3] - vecB[3]) < 0.2 ? 0.65 : 0.35,
      mevSustainability: Math.abs(vecA[4] - vecB[4]) < 0.3 ? 0.72 : 0.4,
      socialCoherence: Math.abs(vecA[5] - vecB[5]) < 0.25 ? 0.68 : 0.38,
    },
  });
});

router.get("/behavioral/coherence/:coalitionId", async (req, res) => {
  const [coalition] = await db.select().from(coalitionsTable).where(eq(coalitionsTable.id, req.params.coalitionId));
  if (!coalition) { res.status(404).json({ error: "Coalition not found" }); return; }

  const members = await db.select().from(coalitionMembersTable).where(eq(coalitionMembersTable.coalitionId, req.params.coalitionId));
  const n = Math.max(1, members.length);

  const physical = Math.min(1, 0.6 + (n / 10) * 0.3 + Math.random() * 0.1);
  const mental = Math.min(1, 0.55 + (coalition.formationTrust || 0) * 0.3 + Math.random() * 0.1);
  const spiritual = Math.min(1, 0.5 + Math.random() * 0.4);
  const conscious = Math.min(1, 0.4 + Math.random() * 0.3);
  const anima = Math.min(1, 0.45 + Math.random() * 0.35);

  const weights = { physical: 0.25, mental: 0.30, spiritual: 0.25, conscious: 0.10, anima: 0.10 };
  const totalScore = physical * weights.physical + mental * weights.mental + spiritual * weights.spiritual + conscious * weights.conscious + anima * weights.anima;
  const threshold = 0.5 + Math.random() * 0.2;

  res.json({
    coalitionId: req.params.coalitionId,
    totalScore,
    threshold,
    isActionable: totalScore >= threshold,
    planes: { physical, mental, spiritual, conscious, anima },
  });
});

export default router;
