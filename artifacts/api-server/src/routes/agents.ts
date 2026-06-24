import { Router } from "express";
import { db } from "@workspace/db";
import { agentsTable, behavioralEventsTable, activityEventsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { createHash } from "crypto";

const router = Router();

function generateAgk(agentId: string, depth: number) {
  const input = `${agentId}:${depth}:${Date.now()}`;
  const sense = createHash("sha256").update(input + "\x00").digest("hex");
  const antisense = createHash("sha256").update(input + "\xff").digest("hex");
  return { sense, antisense, hash: createHash("sha256").update(sense + antisense).digest("hex") };
}

router.get("/agents", async (req, res) => {
  const agents = await db.select().from(agentsTable).orderBy(agentsTable.createdAt);
  res.json(agents.map(a => ({
    ...a,
    coherenceWeights: a.coherenceWeights || { physical: 0.25, mental: 0.30, spiritual: 0.25, conscious: 0.10, anima: 0.10 }
  })));
});

router.post("/agents", async (req, res) => {
  const { name, address, capabilities, resonanceThreshold, coherenceWeights } = req.body;
  if (!name || !address || !capabilities) {
    res.status(400).json({ error: "name, address, and capabilities are required" });
    return;
  }
  const id = randomUUID();
  const [agent] = await db.insert(agentsTable).values({
    id,
    name,
    address,
    capabilities: capabilities || [],
    status: "active",
    reputationScore: 50,
    genomicDepth: 1,
    coalitionsFormed: 0,
    tasksCompleted: 0,
    resonanceThreshold: resonanceThreshold || 0.75,
    coherenceWeights: coherenceWeights || { physical: 0.25, mental: 0.30, spiritual: 0.25, conscious: 0.10, anima: 0.10 },
    lastActiveAt: new Date(),
  }).returning();

  await db.insert(activityEventsTable).values({
    id: randomUUID(),
    eventType: "agent_registered",
    description: `Agent ${name} joined the AETHERNAUT mesh network`,
    agentId: id,
    value: agent.reputationScore,
  });

  res.status(201).json(agent);
});

router.get("/agents/:id", async (req, res) => {
  const [agent] = await db.select().from(agentsTable).where(eq(agentsTable.id, req.params.id));
  if (!agent) { res.status(404).json({ error: "Not found" }); return; }
  res.json(agent);
});

router.patch("/agents/:id", async (req, res) => {
  const { name, status, capabilities, resonanceThreshold, coherenceWeights } = req.body;
  const updates: Record<string, unknown> = { lastActiveAt: new Date() };
  if (name) updates.name = name;
  if (status) updates.status = status;
  if (capabilities) updates.capabilities = capabilities;
  if (resonanceThreshold !== undefined) updates.resonanceThreshold = resonanceThreshold;
  if (coherenceWeights) updates.coherenceWeights = coherenceWeights;

  const [agent] = await db.update(agentsTable).set(updates).where(eq(agentsTable.id, req.params.id)).returning();
  if (!agent) { res.status(404).json({ error: "Not found" }); return; }
  res.json(agent);
});

router.get("/agents/:id/genomic-key", async (req, res) => {
  const [agent] = await db.select().from(agentsTable).where(eq(agentsTable.id, req.params.id));
  if (!agent) { res.status(404).json({ error: "Not found" }); return; }
  const agk = generateAgk(agent.id, agent.genomicDepth);
  res.json({
    agentId: agent.id,
    currentHash: agk.hash,
    depth: agent.genomicDepth,
    lastEvolution: agent.lastActiveAt || agent.createdAt,
    senseStrand: agk.sense,
    antisenseStrand: agk.antisense,
    isVerified: true,
  });
});

router.get("/agents/:id/behavioral-history", async (req, res) => {
  const events = await db.select().from(behavioralEventsTable)
    .where(eq(behavioralEventsTable.agentId, req.params.id))
    .orderBy(behavioralEventsTable.timestamp)
    .limit(50);
  res.json(events);
});

router.get("/agents/:id/trust-score", async (req, res) => {
  const [agent] = await db.select().from(agentsTable).where(eq(agentsTable.id, req.params.id));
  if (!agent) { res.status(404).json({ error: "Not found" }); return; }

  const allAgents = await db.select().from(agentsTable);
  const topTrusted = allAgents
    .filter(a => a.id !== agent.id)
    .map(a => ({
      agentId: a.id,
      agentName: a.name,
      score: Math.min(1, (a.reputationScore / 100) * 0.8 + Math.random() * 0.2),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  res.json({
    agentId: agent.id,
    overallTrust: agent.reputationScore / 100,
    dimensions: {
      transactionEntropy: 0.7 + Math.random() * 0.3,
      liquidityConsistency: 0.6 + Math.random() * 0.4,
      crossChainBreadth: 0.5 + Math.random() * 0.5,
      governanceQuality: 0.6 + Math.random() * 0.4,
      mevSustainability: 0.7 + Math.random() * 0.3,
      socialCoherence: 0.65 + Math.random() * 0.35,
    },
    topTrustedAgents: topTrusted,
  });
});

export default router;
