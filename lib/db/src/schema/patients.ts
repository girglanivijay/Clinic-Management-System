import { pgTable, serial, text, integer, numeric, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const patientsTable = pgTable("patients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  age: integer("age").notNull(),
  address: text("address").notNull(),
  mobile: text("mobile").notNull(),
  complaintCode: text("complaint_code"),
  complaint: text("complaint"),
  treatment: text("treatment"),
  advice: text("advice"),
  reports: text("reports"),
  fees: numeric("fees", { precision: 10, scale: 2 }).notNull().default("0"),
  visitDate: date("visit_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPatientSchema = createInsertSchema(patientsTable).omit({ id: true, createdAt: true });
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Patient = typeof patientsTable.$inferSelect;
