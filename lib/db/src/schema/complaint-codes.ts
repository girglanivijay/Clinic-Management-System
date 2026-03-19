import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const complaintCodesTable = pgTable("complaint_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  complaint: text("complaint").notNull(),
  treatment: text("treatment").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertComplaintCodeSchema = createInsertSchema(complaintCodesTable).omit({ id: true, createdAt: true });
export type InsertComplaintCode = z.infer<typeof insertComplaintCodeSchema>;
export type ComplaintCode = typeof complaintCodesTable.$inferSelect;
