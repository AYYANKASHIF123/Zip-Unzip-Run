import { and, desc, eq } from "drizzle-orm";
import { appRecords, db } from "@workspace/db";

export type RecordKind =
  | "analysis"
  | "validation"
  | "audit"
  | "notification"
  | "report"
  | "pipeline_run";

export async function listRecords<T extends Record<string, unknown> = Record<string, unknown>>(
  kind: RecordKind,
  limit = 500,
): Promise<T[]> {
  const rows = await db
    .select({ payload: appRecords.payload })
    .from(appRecords)
    .where(eq(appRecords.kind, kind))
    .orderBy(desc(appRecords.createdAt))
    .limit(limit);
  return rows.map((row) => row.payload as T);
}

export async function getRecord<T extends Record<string, unknown> = Record<string, unknown>>(
  kind: RecordKind,
  key: string | number,
): Promise<T | null> {
  const [row] = await db
    .select({ payload: appRecords.payload })
    .from(appRecords)
    .where(and(eq(appRecords.kind, kind), eq(appRecords.recordKey, String(key))))
    .limit(1);
  return row ? (row.payload as T) : null;
}

export async function saveRecord<T extends Record<string, unknown>>(
  kind: RecordKind,
  key: string | number,
  payload: T,
): Promise<T> {
  await db
    .insert(appRecords)
    .values({
      kind,
      recordKey: String(key),
      payload,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [appRecords.kind, appRecords.recordKey],
      set: { payload, updatedAt: new Date() },
    });
  return payload;
}
