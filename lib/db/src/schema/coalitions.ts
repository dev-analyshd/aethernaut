import { pgTable, text, real, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const coalitionsTable = pgTable("coalitions", {
  id: text("id").primaryKey(),
  taskType: text("task_type").notNull(),
  status: text("status").notNull().default("forming"),
  memberCount: integer("member_count").notNull().default(0),
  minAgents: integer("min_agents").notNull(),
  maxAgents: integer("max_agents").notNull(),
  formationTrust: real("formation_trust").notNull().default(0),
  coherenceScore: real("coherence_score"),
  totalRewardDistributed: real("total_reward_distributed"),
  valueSplit: text("value_split").notNull().default("proportional-to-contribution"),
  timeoutSeconds: integer("timeout_seconds").notNull().default(3600),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  dissolvedAt: timestamp("dissolved_at"),
});

export const coalitionMembersTable = pgTable("coalition_members", {
  id: text("id").primaryKey(),
  coalitionId: text("coalition_id").notNull().references(() => coalitionsTable.id),
  agentId: text("agent_id").notNull(),
  agentName: text("agent_name").notNull(),
  role: text("role").notNull().default("participant"),
  contribution: real("contribution").notNull().default(0),
  rewardShare: real("reward_share").notNull().default(0),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
});

export const insertCoalitionSchema = createInsertSchema(coalitionsTable).omit({ createdAt: true, dissolvedAt: true });
export type InsertCoalition = z.infer<typeof insertCoalitionSchema>;
export type Coalition = typeof coalitionsTable.$inferSelect;
export type CoalitionMember = typeof coalitionMembersTable.$inferSelect;
