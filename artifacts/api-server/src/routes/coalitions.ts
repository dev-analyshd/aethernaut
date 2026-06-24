import { Router } from "express";
import { db } from "@workspace/db";
import { coalitionsTable, coalitionMembersTable, agentsTable, activityEventsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

router.get("/coalitions", async (req, res) => {
  const coalitions = await db.select().from(coalitionsTable).orderBy(coalitionsTable.createdAt);
  res.json(coalitions);
});

router.post("/coalitions", async (req, res) => {
  const { taskType, minAgents, maxAgents, seedAgentId, valueSplit, timeoutSeconds } = req.body;
  if (!taskType || !minAgents || !maxAgents) {
    res.status(400).json({ error: "taskType, minAgents, maxAgents required" });
    return;
  }

  const id = randomUUID();
  const [coalition] = await db.insert(coalitionsTable).values({
    id,
    taskType,
    status: "forming",
    memberCount: seedAgentId ? 1 : 0,
    minAgents,
    maxAgents,
    formationTrust: 0,
    valueSplit: valueSplit || "proportional-to-contribution",
    timeoutSeconds: timeoutSeconds || 3600,
  }).returning();

  if (seedAgentId) {
    const [agent] = await db.select().from(agentsTable).where(eq(agentsTable.id, seedAgentId));
    if (agent) {
      await db.insert(coalitionMembersTable).values({
        id: randomUUID(),
        coalitionId: id,
        agentId: agent.id,
        agentName: agent.name,
        role: "seed",
        contribution: 0,
        rewardShare: 0,
      });
      await db.update(agentsTable).set({ status: "in_coalition", lastActiveAt: new Date() }).where(eq(agentsTable.id, seedAgentId));
      await db.update(coalitionsTable).set({ formationTrust: agent.reputationScore / 100, status: "active" }).where(eq(coalitionsTable.id, id));
    }
  }

  await db.insert(activityEventsTable).values({
    id: randomUUID(),
    eventType: "coalition_formed",
    description: `New ${taskType} coalition formed`,
    coalitionId: id,
  });

  const [updated] = await db.select().from(coalitionsTable).where(eq(coalitionsTable.id, id));
  res.status(201).json(updated);
});

router.get("/coalitions/:id", async (req, res) => {
  const [coalition] = await db.select().from(coalitionsTable).where(eq(coalitionsTable.id, req.params.id));
  if (!coalition) { res.status(404).json({ error: "Not found" }); return; }
  res.json(coalition);
});

router.post("/coalitions/:id/dissolve", async (req, res) => {
  const [coalition] = await db.select().from(coalitionsTable).where(eq(coalitionsTable.id, req.params.id));
  if (!coalition) { res.status(404).json({ error: "Not found" }); return; }

  const [dissolved] = await db.update(coalitionsTable)
    .set({ status: "dissolved", dissolvedAt: new Date() })
    .where(eq(coalitionsTable.id, req.params.id))
    .returning();

  const members = await db.select().from(coalitionMembersTable).where(eq(coalitionMembersTable.coalitionId, req.params.id));
  for (const m of members) {
    await db.update(agentsTable).set({ status: "idle", lastActiveAt: new Date() }).where(eq(agentsTable.id, m.agentId));
  }

  await db.insert(activityEventsTable).values({
    id: randomUUID(),
    eventType: "coalition_dissolved",
    description: `${coalition.taskType} coalition dissolved ephemerally`,
    coalitionId: req.params.id,
    value: coalition.totalRewardDistributed,
  });

  res.json(dissolved);
});

router.get("/coalitions/:id/members", async (req, res) => {
  const members = await db.select().from(coalitionMembersTable)
    .where(eq(coalitionMembersTable.coalitionId, req.params.id));
  res.json(members);
});

export default router;
