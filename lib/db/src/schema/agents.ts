import { pgTable, text, real, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const agentsTable = pgTable("agents", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull().unique(),
  status: text("status").notNull().default("idle"),
  capabilities: jsonb("capabilities").$type<string[]>().notNull().default([]),
  reputationScore: real("reputation_score").notNull().default(50),
  genomicDepth: integer("genomic_depth").notNull().default(0),
  coalitionsFormed: integer("coalitions_formed").notNull().default(0),
  tasksCompleted: integer("tasks_completed").notNull().default(0),
  resonanceThreshold: real("resonance_threshold").notNull().default(0.75),
  coherenceWeights: jsonb("coherence_weights").$type<Record<string, number>>().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastActiveAt: timestamp("last_active_at"),
});

export const insertAgentSchema = createInsertSchema(agentsTable).omit({ createdAt: true, lastActiveAt: true });
export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Agent = typeof agentsTable.$inferSelect;
