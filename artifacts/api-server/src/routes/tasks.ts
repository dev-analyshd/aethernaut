import { Router } from "express";
import { db } from "@workspace/db";
import { tasksTable, activityEventsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

router.get("/tasks", async (req, res) => {
  const tasks = await db.select().from(tasksTable).orderBy(tasksTable.createdAt);
  res.json(tasks);
});

router.post("/tasks", async (req, res) => {
  const { name, taskType, priority, coherenceRequired, route, estimatedReward } = req.body;
  if (!name || !taskType || !priority) {
    res.status(400).json({ error: "name, taskType, priority required" });
    return;
  }

  const id = randomUUID();
  const [task] = await db.insert(tasksTable).values({
    id,
    name,
    taskType,
    status: "pending",
    priority,
    coherenceRequired: coherenceRequired ?? 0.7,
    route: route || null,
    estimatedReward: estimatedReward || null,
  }).returning();

  res.status(201).json(task);
});

router.get("/tasks/:id", async (req, res) => {
  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, req.params.id));
  if (!task) { res.status(404).json({ error: "Not found" }); return; }
  res.json(task);
});

export default router;
