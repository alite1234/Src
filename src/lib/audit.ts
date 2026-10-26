import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";

export async function logAudit(input: {
  eventId?: string | null;
  userId?: string | null;
  action: string;
  details?: Record<string, unknown>;
}) {
  try {
    await db.insert(auditLogs).values({
      eventId: input.eventId ?? null,
      userId: input.userId ?? null,
      action: input.action,
      details: input.details ?? {},
    });
  } catch (error) {
    console.error("Failed to write audit log", error);
  }
}
