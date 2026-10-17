import { jsonb, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const appRecords = pgTable(
  "app_records",
  {
    id: serial("id").primaryKey(),
    kind: text("kind").notNull(),
    recordKey: text("record_key").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    kindRecordKeyUnique: uniqueIndex("app_records_kind_record_key_uq").on(table.kind, table.recordKey),
  }),
);

export type AppRecord = typeof appRecords.$inferSelect;
