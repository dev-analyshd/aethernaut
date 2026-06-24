import { Router } from "express";
import { db } from "@workspace/db";
import { agentsTable, coalitionsTable, tasksTable, activityEventsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();

const LOSAR_ROUTES = [
  { route: "INJ→ATOM→OSMO→INJ", losarScore: 0.872, liquidityDepth: 0.91, sybildResistance: 0.88, stressRatio: 0.94, manipulationScore: 0.07, isOptimal: true },
  { route: "INJ→ETH→USDC→INJ", losarScore: 0.814, liquidityDepth: 0.95, sybildResistance: 0.71, stressRatio: 0.88, manipulationScore: 0.12, isOptimal: false },
  { route: "INJ→OSMO→ATOM→USDC→INJ", losarScore: 0.756, liquidityDepth: 0.82, sybildResistance: 0.84, stressRatio: 0.79, manipulationScore: 0.09, isOptimal: false },
  { route: "INJ→WBTC→ETH→INJ", losarScore: 0.731, liquidityDepth: 0.89, sybildResistance: 0.66, stressRatio: 0.85, manipulationScore: 0.18, isOptimal: false },
  { route: "INJ→STRD→ATOM→INJ", losarScore: 0.698, liquidityDepth: 0.74, sybildResistance: 0.82, stressRatio: 0.77, manipulationScore: 0.11, isOptimal: false },
];

router.get("/network/stats", async (req, res) => {
  const allAgents = await db.select().from(agentsTable);
  const allCoalitions = await db.select().from(coalitionsTable);
  const allTasks = await db.select().from(tasksTable);

  const activeAgents = allAgents.filter(a => a.status === "active" || a.status === "in_coalition").length;
  const activeCoalitions = allCoalitions.filter(c => c.status === "active" || c.status === "forming" || c.status === "executing").length;
  const completedTasks = allTasks.filter(t => t.status === "completed");
  const totalReward = completedTasks.reduce((s, t) => s + (t.actualReward || 0), 0);
  const avgTrust = allAgents.length ? allAgents.reduce((s, a) => s + a.reputationScore, 0) / allAgents.length / 100 : 0;

  const capMap = new Map<string, number>();
  for (const agent of allAgents) {
    for (const cap of (agent.capabilities as string[] || [])) {
      capMap.set(cap, (capMap.get(cap) || 0) + 1);
    }
  }

  const taskMap = new Map<string, { count: number; totalReward: number }>();
  for (const task of allTasks) {
    const existing = taskMap.get(task.taskType) || { count: 0, totalReward: 0 };
    taskMap.set(task.taskType, { count: existing.count + 1, totalReward: existing.totalReward + (task.actualReward || 0) });
  }

  res.json({
    totalAgents: allAgents.length,
    activeAgents,
    activeCoalitions,
    totalTasksCompleted: completedTasks.length,
    totalRewardDistributed: totalReward,
    averageTrustScore: avgTrust,
    networkCoherence: 0.65 + Math.random() * 0.2,
    agentsByCapability: Array.from(capMap.entries()).map(([capability, count]) => ({ capability, count })),
    tasksByType: Array.from(taskMap.entries()).map(([taskType, { count, totalReward }]) => ({ taskType, count, totalReward })),
  });
});

router.get("/network/activity", async (req, res) => {
  const events = await db.select().from(activityEventsTable)
    .orderBy(sql`${activityEventsTable.timestamp} DESC`)
    .limit(30);
  res.json(events);
});

router.get("/network/losar", async (req, res) => {
  res.json(LOSAR_ROUTES);
});

export default router;
