import { createInsertSchema } from "drizzle-zod";
import {
  boolean,
  date,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const medicinesTable = pgTable(
  "medicines",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    genericName: text("generic_name").notNull(),
    strength: text("strength").notNull(),
    form: text("form").notNull(),
    category: text("category").notNull(),
    minStock: integer("min_stock").notNull().default(0),
    packSize: integer("pack_size").notNull().default(1),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    nameIndex: uniqueIndex("medicines_name_strength_idx").on(
      table.name,
      table.strength,
      table.form,
    ),
  }),
);

export const batchesTable = pgTable(
  "medicine_batches",
  {
    id: serial("id").primaryKey(),
    medicineId: integer("medicine_id")
      .notNull()
      .references(() => medicinesTable.id),
    batchNumber: text("batch_number").notNull(),
    supplier: text("supplier").notNull(),
    packSize: integer("pack_size").notNull(),
    quantityReceived: integer("quantity_received").notNull(),
    unitsRemaining: integer("units_remaining").notNull(),
    expiryDate: date("expiry_date", { mode: "string" }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    batchIndex: uniqueIndex("medicine_batches_medicine_batch_idx").on(
      table.medicineId,
      table.batchNumber,
    ),
  }),
);

export const stockTransactionsTable = pgTable("stock_transactions", {
  id: serial("id").primaryKey(),
  medicineId: integer("medicine_id")
    .notNull()
    .references(() => medicinesTable.id),
  batchId: integer("batch_id").references(() => batchesTable.id),
  type: text("type").notNull(),
  quantity: integer("quantity").notNull(),
  reference: text("reference"),
  reason: text("reason"),
  userName: text("user_name").notNull().default("Ofentse Rakgogo"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const chronicSchedulesTable = pgTable("chronic_schedules", {
  id: serial("id").primaryKey(),
  patientReference: text("patient_reference").notNull().unique(),
  displayName: text("display_name").notNull(),
  medicineId: integer("medicine_id")
    .notNull()
    .references(() => medicinesTable.id),
  quantity: integer("quantity").notNull(),
  intervalDays: integer("interval_days").notNull(),
  lastCollection: date("last_collection", { mode: "string" }),
  nextCollection: date("next_collection", { mode: "string" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const replenishmentsTable = pgTable("replenishments", {
  id: serial("id").primaryKey(),
  medicineId: integer("medicine_id")
    .notNull()
    .references(() => medicinesTable.id),
  currentStock: integer("current_stock").notNull(),
  minStock: integer("min_stock").notNull(),
  suggestedQuantity: integer("suggested_quantity").notNull(),
  requestedQuantity: integer("requested_quantity").notNull(),
  status: text("status").notNull().default("candidate"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const auditLogsTable = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  action: text("action").notNull(),
  userName: text("user_name").notNull(),
  role: text("role").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMedicineSchema = createInsertSchema(medicinesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMedicine = z.infer<typeof insertMedicineSchema>;
export type Medicine = typeof medicinesTable.$inferSelect;
export type Batch = typeof batchesTable.$inferSelect;
export type StockTransaction = typeof stockTransactionsTable.$inferSelect;
export type ChronicSchedule = typeof chronicSchedulesTable.$inferSelect;
export type Replenishment = typeof replenishmentsTable.$inferSelect;
export type AuditLog = typeof auditLogsTable.$inferSelect;