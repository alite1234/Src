"use server";

import { asc, count, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { adminContext, revalidateSummit } from "@/lib/admin-context";
import { logAudit } from "@/lib/audit";
import { AUDIT_ACTIONS } from "@/lib/constants";
import { db } from "@/lib/db";
import { scoreboards, teams } from "@/lib/db/schema";
import { publishEventUpdate } from "@/lib/realtime/server";
import type { ActionState } from "@/lib/action-state";
import type {
  AnimationPreset,
  ScoreboardDisplayMode,
} from "@/lib/types";

const animations = [
  "fade",
  "slide",
  "rise",
  "zoom",
  "reveal",
  "spotlight",
] as const satisfies readonly AnimationPreset[];

const displayModes = [
  "sequential",
  "full",
  "podium",
  "score_only",
] as const satisfies readonly ScoreboardDisplayMode[];

const boardSchema = z.object({
  title: z.string().trim().min(2, "A scoreboard title is required.").max(120),
  description: z.string().trim().max(500).optional(),
  mode: z.enum(["individual", "team"]),
  displayMode: z.enum(displayModes),
  tieBreaker: z.enum(["name", "order"]),
  animation: z.enum(animations),
});

function boardFormData(formData: FormData) {
  return {
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    mode: String(formData.get("mode") ?? "team"),
    displayMode: String(formData.get("displayMode") ?? "sequential"),
    tieBreaker: String(formData.get("tieBreaker") ?? "name"),
    animation: String(formData.get("animation") ?? "reveal"),
  };
}

function optional(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

export async function createScoreboardAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await adminContext();
  if (!ctx.ok) return { error: ctx.error };

  const [existing] = await db
    .select({ id: scoreboards.id })
    .from(scoreboards)
    .where(eq(scoreboards.eventId, ctx.event.id))
    .limit(1);
  if (existing) return { error: "This summit already has a scoreboard." };

  const parsed = boardSchema.safeParse(boardFormData(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const [created] = await db
    .insert(scoreboards)
    .values({
      eventId: ctx.event.id,
      title: parsed.data.title,
      description: optional(parsed.data.description),
      mode: parsed.data.mode,
      displayMode: parsed.data.displayMode,
      tieBreaker: parsed.data.tieBreaker,
      animation: parsed.data.animation,
    })
    .returning();

  await logAudit({
    eventId: ctx.event.id,
    userId: ctx.user.id,
    action: AUDIT_ACTIONS.scoreboardUpdated,
    details: { scoreboardId: created.id, created: true },
  });
  revalidateSummit();
  return { ok: true, message: "Scoreboard created." };
}

export async function updateScoreboardAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await adminContext();
  if (!ctx.ok) return { error: ctx.error };

  const [board] = await db
    .select()
    .from(scoreboards)
    .where(eq(scoreboards.eventId, ctx.event.id))
    .limit(1);
  if (!board) return { error: "Create a scoreboard first." };

  const parsed = boardSchema.safeParse(boardFormData(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  await db
    .update(scoreboards)
    .set({
      title: parsed.data.title,
      description: optional(parsed.data.description),
      mode: parsed.data.mode,
      displayMode: parsed.data.displayMode,
      tieBreaker: parsed.data.tieBreaker,
      animation: parsed.data.animation,
      updatedAt: new Date(),
    })
    .where(eq(scoreboards.id, board.id));

  await logAudit({
    eventId: ctx.event.id,
    userId: ctx.user.id,
    action: AUDIT_ACTIONS.scoreboardUpdated,
    details: { scoreboardId: board.id },
  });
  await publishEventUpdate(ctx.event.id);
  revalidateSummit();
  return { ok: true, message: "Scoreboard settings saved." };
}

export async function addTeamAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await adminContext();
  if (!ctx.ok) return { error: ctx.error };

  const [board] = await db
    .select()
    .from(scoreboards)
    .where(eq(scoreboards.eventId, ctx.event.id))
    .limit(1);
  if (!board) return { error: "Create a scoreboard first." };

  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const score = Number(formData.get("score") ?? 0);
  if (name.length < 2) return { error: "Enter a name for this entry." };
  if (!Number.isFinite(score)) return { error: "Enter a valid score." };

  const rows = await db
    .select({ displayOrder: teams.displayOrder })
    .from(teams)
    .where(eq(teams.scoreboardId, board.id));
  const nextOrder =
    rows.reduce((max, row) => Math.max(max, row.displayOrder), -1) + 1;

  const [created] = await db
    .insert(teams)
    .values({
      scoreboardId: board.id,
      name,
      score: Math.round(score),
      displayOrder: nextOrder,
    })
    .returning();

  await logAudit({
    eventId: ctx.event.id,
    userId: ctx.user.id,
    action: AUDIT_ACTIONS.scoreChanged,
    details: {
      entryId: created.id,
      name: created.name,
      from: null,
      to: created.score,
      reason: "entry created",
    },
  });
  await publishEventUpdate(ctx.event.id);
  revalidateSummit();
  return { ok: true, message: `${created.name} added.` };
}

export async function updateTeamAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await adminContext();
  if (!ctx.ok) return { error: ctx.error };

  const teamId = String(formData.get("teamId") ?? "");
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const score = Number(formData.get("score") ?? 0);
  if (name.length < 2) return { error: "Enter a name for this entry." };
  if (!Number.isFinite(score)) return { error: "Enter a valid score." };

  const [board] = await db
    .select()
    .from(scoreboards)
    .where(eq(scoreboards.eventId, ctx.event.id))
    .limit(1);
  if (!board) return { error: "Create a scoreboard first." };

  const [entry] = await db
    .select()
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);
  if (!entry || entry.scoreboardId !== board.id) {
    return { error: "That scoreboard entry could not be found." };
  }

  await db
    .update(teams)
    .set({
      name,
      score: Math.round(score),
      updatedAt: new Date(),
    })
    .where(eq(teams.id, teamId));

  if (entry.score !== Math.round(score)) {
    await logAudit({
      eventId: ctx.event.id,
      userId: ctx.user.id,
      action: AUDIT_ACTIONS.scoreChanged,
      details: {
        entryId: teamId,
        name,
        from: entry.score,
        to: Math.round(score),
      },
    });
  }
  await publishEventUpdate(ctx.event.id);
  revalidateSummit();
  return { ok: true, message: "Entry saved." };
}

export async function deleteTeamAction(formData: FormData) {
  const ctx = await adminContext();
  if (!ctx.ok) return;
  const teamId = String(formData.get("teamId") ?? "");

  const [board] = await db
    .select()
    .from(scoreboards)
    .where(eq(scoreboards.eventId, ctx.event.id))
    .limit(1);
  if (!board) return;

  const [entry] = await db
    .select()
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);
  if (!entry || entry.scoreboardId !== board.id) return;

  await db.delete(teams).where(eq(teams.id, teamId));
  await logAudit({
    eventId: ctx.event.id,
    userId: ctx.user.id,
    action: AUDIT_ACTIONS.scoreboardUpdated,
    details: { entryId: teamId, deleted: true, name: entry.name },
  });
  await publishEventUpdate(ctx.event.id);
  revalidateSummit();
}

export async function moveTeamAction(formData: FormData) {
  const ctx = await adminContext();
  if (!ctx.ok) return;
  const teamId = String(formData.get("teamId") ?? "");
  const direction = String(formData.get("direction") ?? "");
  if (direction !== "up" && direction !== "down") return;

  const [board] = await db
    .select()
    .from(scoreboards)
    .where(eq(scoreboards.eventId, ctx.event.id))
    .limit(1);
  if (!board) return;

  const list = await db
    .select()
    .from(teams)
    .where(eq(teams.scoreboardId, board.id))
    .orderBy(asc(teams.displayOrder), asc(teams.createdAt));

  const index = list.findIndex((entry) => entry.id === teamId);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= list.length) return;

  const reordered = [...list];
  [reordered[index], reordered[target]] = [
    reordered[target],
    reordered[index],
  ];

  await db.transaction(async (tx) => {
    for (let position = 0; position < reordered.length; position += 1) {
      await tx
        .update(teams)
        .set({ displayOrder: position })
        .where(eq(teams.id, reordered[position].id));
    }
  });
  revalidateSummit();
}

export async function scoreboardEntryCount(scoreboardId: string) {
  const [row] = await db
    .select({ value: count(teams.id) })
    .from(teams)
    .where(eq(teams.scoreboardId, scoreboardId));
  return Number(row?.value ?? 0);
}

export async function firstScoreboard(eventId: string) {
  const [row] = await db
    .select()
    .from(scoreboards)
    .where(eq(scoreboards.eventId, eventId))
    .orderBy(desc(scoreboards.createdAt))
    .limit(1);
  return row ?? null;
}
