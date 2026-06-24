import { pgTable, text, real, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const behavioralEventsTable = pgTable("behavioral_events", {
  id: text("id").primaryKey(),
  agentId: text("agent_id").notNull(),
  eventType: text("event_type").notNull(),
  behavioralHash: text("behavioral_hash").notNull(),
  blockNumber: integer("block_number").notNull(),
  entropyScore: real("entropy_score"),
  manipulationFingerprintDetected: boolean("manipulation_fingerprint_detected").notNull().default(false),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const activityEventsTable = pgTable("activity_events", {
  id: text("id").primaryKey(),
  eventType: text("event_type").notNull(),
  description: text("description").notNull(),
  agentId: text("agent_id"),
  coalitionId: text("coalition_id"),
  taskId: text("task_id"),
  value: real("value"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertBehavioralEventSchema = createInsertSchema(behavioralEventsTable).omit({ timestamp: true });
export type InsertBehavioralEvent = z.infer<typeof insertBehavioralEventSchema>;
export type BehavioralEvent = typeof behavioralEventsTable.$inferSelect;
export type ActivityEvent = typeof activityEventsTable.$inferSelect;
