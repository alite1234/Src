"use server";

import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";

import { adminContext, revalidateSummit } from "@/lib/admin-context";
import { logAudit } from "@/lib/audit";
import { AUDIT_ACTIONS } from "@/lib/constants";
import { db } from "@/lib/db";
import { fixtures } from "@/lib/db/schema";
import { publishEventUpdate } from "@/lib/realtime/server";
import type { ActionState } from "@/lib/action-state";

const fixtureStatuses = ["scheduled", "live", "completed"] as const;

const fixtureSchema = z.object({
  stage: z.string().trim().min(1, "A stage or group label is required.").max(80),
  teamA: z.string().trim().min(1, "Team A is required.").max(120),
  teamB: z.string().trim().min(1, "Team B is required.").max(120),
  scoreA: z.preprocess(
    (value) =>
      value === "" || value === null || value === undefined ? null : Number(value),
    z.number().int().min(0).max(999).nullable(),
  ),
  scoreB: z.preprocess(
    (value) =>
      value === "" || value === null || value === undefined ? null : Number(value),
    z.number().int().min(0).max(999).nullable(),
  ),
  scheduledAt: z.preprocess(
    (value) => (value === "" || value === null || typeof value !== "string" ? null : value),
    z.string().datetime({ offset: true }).nullable(),
  ),
  venue: z.string().trim().max(120).optional(),
  status: z.enum(fixtureStatuses),
});

function formDataToFixture(formData: FormData) {
  const rawKickoff = String(formData.get("scheduledAt") ?? "").trim();
  const scheduledAt = rawKickoff
    ? new Date(rawKickoff).toISOString()
    : "";

  return {
    stage: String(formData.get("stage") ?? ""),
    teamA: String(formData.get("teamA") ?? ""),
    teamB: String(formData.get("teamB") ?? ""),
    scoreA: String(formData.get("scoreA") ?? ""),
    scoreB: String(formData.get("scoreB") ?? ""),
    scheduledAt,
    venue: String(formData.get("venue") ?? ""),
    status: String(formData.get("status") ?? "scheduled"),
  };
}

function optional(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function nextDisplayOrder(tx: Tx, eventId: string) {
  const [row] = await tx
    .select({
      value: sql<number>`coalesce(max(${fixtures.displayOrder}), -1)`,
    })
    .from(fixtures)
    .where(eq(fixtures.eventId, eventId));
  return Number(row?.value ?? -1) + 1;
}

export async function createFixtureAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await adminContext();
  if (!ctx.ok) return { error: ctx.error };

  const parsed = fixtureSchema.safeParse(formDataToFixture(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const [created] = await db.transaction(async (tx) => {
    const displayOrder = await nextDisplayOrder(tx, ctx.event.id);
    return tx
      .insert(fixtures)
      .values({
        eventId: ctx.event.id,
        stage: parsed.data.stage,
        teamA: parsed.data.teamA,
        teamB: parsed.data.teamB,
        scoreA: parsed.data.scoreA,
        scoreB: parsed.data.scoreB,
        scheduledAt: parsed.data.scheduledAt
          ? new Date(parsed.data.scheduledAt)
          : null,
        venue: optional(parsed.data.venue),
        status: parsed.data.status,
        displayOrder,
      })
      .returning();
  });

  await logAudit({
    eventId: ctx.event.id,
    userId: ctx.user.id,
    action: AUDIT_ACTIONS.fixtureCreated,
    details: {
      fixtureId: created.id,
      match: `${created.teamA} vs ${created.teamB}`,
    },
  });
  await publishEventUpdate(ctx.event.id);
  revalidateSummit();
  return { ok: true, message: "Match added to the draw." };
}

export async function updateFixtureAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await adminContext();
  if (!ctx.ok) return { error: ctx.error };
  const fixtureId = String(formData.get("fixtureId") ?? "");

  const [existing] = await db
    .select()
    .from(fixtures)
    .where(eq(fixtures.id, fixtureId))
    .limit(1);
  if (!existing || existing.eventId !== ctx.event.id) {
    return { error: "That match could not be found." };
  }

  const parsed = fixtureSchema.safeParse(formDataToFixture(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  await db
    .update(fixtures)
    .set({
      stage: parsed.data.stage,
      teamA: parsed.data.teamA,
      teamB: parsed.data.teamB,
      scoreA: parsed.data.scoreA,
      scoreB: parsed.data.scoreB,
      scheduledAt: parsed.data.scheduledAt
        ? new Date(parsed.data.scheduledAt)
        : null,
      venue: optional(parsed.data.venue),
      status: parsed.data.status,
      updatedAt: new Date(),
    })
    .where(eq(fixtures.id, fixtureId));

  await logAudit({
    eventId: ctx.event.id,
    userId: ctx.user.id,
    action: AUDIT_ACTIONS.fixtureUpdated,
    details: {
      fixtureId,
      match: `${parsed.data.teamA} vs ${parsed.data.teamB}`,
    },
  });
  await publishEventUpdate(ctx.event.id);
  revalidateSummit();
  return { ok: true, message: "Match saved." };
}

export async function deleteFixtureAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await adminContext();
  if (!ctx.ok) return { error: ctx.error };
  const fixtureId = String(formData.get("fixtureId") ?? "");

  const [existing] = await db
    .select()
    .from(fixtures)
    .where(eq(fixtures.id, fixtureId))
    .limit(1);
  if (!existing || existing.eventId !== ctx.event.id) {
    return { error: "That match could not be found." };
  }

  await db.transaction(async (tx) => {
    await tx.delete(fixtures).where(eq(fixtures.id, fixtureId));
    const remaining = await tx
      .select({ id: fixtures.id })
      .from(fixtures)
      .where(eq(fixtures.eventId, ctx.event.id))
      .orderBy(asc(fixtures.displayOrder), asc(fixtures.createdAt));
    if (remaining.length > 0) {
      await tx
        .update(fixtures)
        .set({
          displayOrder: sql`case ${sql.join(
            remaining.map(
              (row, index) =>
                sql`when ${fixtures.id} = ${row.id}::uuid then ${index}`,
            ),
            sql` `,
          )} else ${fixtures.displayOrder} end`,
        })
        .where(
          and(
            eq(fixtures.eventId, ctx.event.id),
            inArray(
              fixtures.id,
              remaining.map((row) => row.id),
            ),
          ),
        );
    }
  });

  await logAudit({
    eventId: ctx.event.id,
    userId: ctx.user.id,
    action: AUDIT_ACTIONS.fixtureDeleted,
    details: {
      fixtureId,
      match: `${existing.teamA} vs ${existing.teamB}`,
    },
  });
  await publishEventUpdate(ctx.event.id);
  revalidateSummit();
  return { ok: true, message: "Match removed from the draw." };
}

export async function moveFixtureAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await adminContext();
  if (!ctx.ok) return { error: ctx.error };
  const fixtureId = String(formData.get("fixtureId") ?? "");
  const direction = String(formData.get("direction") ?? "");
  if (direction !== "up" && direction !== "down") {
    return { error: "Unknown move direction." };
  }

  const list = await db
    .select({ id: fixtures.id })
    .from(fixtures)
    .where(eq(fixtures.eventId, ctx.event.id))
    .orderBy(asc(fixtures.displayOrder), asc(fixtures.createdAt));

  const ids = list.map((row) => row.id);
  const index = ids.indexOf(fixtureId);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= ids.length) {
    return { error: "That match could not be moved." };
  }

  const reordered = [...ids];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

  await db
    .update(fixtures)
    .set({
      displayOrder: sql`case ${sql.join(
        reordered.map(
          (id, position) =>
            sql`when ${fixtures.id} = ${id}::uuid then ${position}`,
        ),
        sql` `,
      )} else ${fixtures.displayOrder} end`,
    })
    .where(
      and(
        eq(fixtures.eventId, ctx.event.id),
        inArray(fixtures.id, reordered),
      ),
    );

  await logAudit({
    eventId: ctx.event.id,
    userId: ctx.user.id,
    action: AUDIT_ACTIONS.fixtureUpdated,
    details: { fixtureId, direction },
  });
  await publishEventUpdate(ctx.event.id);
  revalidateSummit();
  return { ok: true };
}
