"use server";

import { asc, eq } from "drizzle-orm";
import { z } from "zod";

import { adminContext, revalidateSummit } from "@/lib/admin-context";
import { logAudit } from "@/lib/audit";
import { AUDIT_ACTIONS } from "@/lib/constants";
import { db } from "@/lib/db";
import { speakers } from "@/lib/db/schema";
import { publishEventUpdate } from "@/lib/realtime/server";
import type { ActionState } from "@/lib/action-state";
import type { AnimationPreset } from "@/lib/types";

const animations = [
  "fade",
  "slide",
  "rise",
  "zoom",
  "reveal",
  "spotlight",
] as const satisfies readonly AnimationPreset[];

const optionalUuid = z
  .string()
  .trim()
  .refine(
    (value) =>
      value === "" ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        value,
      ),
    "Invalid image reference.",
  )
  .optional();

const speakerSchema = z.object({
  fullName: z.string().trim().min(2, "A speaker name is required.").max(120),
  title: z.string().trim().max(160).optional(),
  institution: z.string().trim().max(160).optional(),
  topic: z.string().trim().max(240).optional(),
  citation: z.string().trim().max(8000).optional(),
  photoFileId: optionalUuid,
  backgroundFileId: optionalUuid,
  durationSeconds: z.coerce.number().int().min(10).max(3600),
  animation: z.enum(animations),
});

function speakerFormData(formData: FormData) {
  return {
    fullName: String(formData.get("fullName") ?? ""),
    title: String(formData.get("title") ?? ""),
    institution: String(formData.get("institution") ?? ""),
    topic: String(formData.get("topic") ?? ""),
    citation: String(formData.get("citation") ?? ""),
    photoFileId: String(formData.get("photoFileId") ?? ""),
    backgroundFileId: String(formData.get("backgroundFileId") ?? ""),
    durationSeconds: String(formData.get("durationSeconds") ?? "120"),
    animation: String(formData.get("animation") ?? "fade"),
  };
}

function optional(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

export async function createSpeakerAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await adminContext();
  if (!ctx.ok) return { error: ctx.error };

  const parsed = speakerSchema.safeParse(speakerFormData(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const existing = await db
    .select({ displayOrder: speakers.displayOrder })
    .from(speakers)
    .where(eq(speakers.eventId, ctx.event.id))
    .orderBy(asc(speakers.displayOrder));

  const nextOrder =
    existing.reduce((max, row) => Math.max(max, row.displayOrder), -1) + 1;

  const [created] = await db
    .insert(speakers)
    .values({
      eventId: ctx.event.id,
      fullName: parsed.data.fullName,
      title: optional(parsed.data.title),
      institution: optional(parsed.data.institution),
      topic: optional(parsed.data.topic),
      citation: optional(parsed.data.citation),
      photoFileId: optional(parsed.data.photoFileId),
      backgroundFileId: optional(parsed.data.backgroundFileId),
      durationSeconds: parsed.data.durationSeconds,
      animation: parsed.data.animation,
      displayOrder: nextOrder,
    })
    .returning();

  await logAudit({
    eventId: ctx.event.id,
    userId: ctx.user.id,
    action: AUDIT_ACTIONS.speakerCreated,
    details: { speakerId: created.id, name: created.fullName },
  });
  revalidateSummit();
  return { ok: true, message: `${created.fullName} was added to the roster.` };
}

export async function updateSpeakerAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await adminContext();
  if (!ctx.ok) return { error: ctx.error };
  const speakerId = String(formData.get("speakerId") ?? "");

  const [existing] = await db
    .select()
    .from(speakers)
    .where(eq(speakers.id, speakerId))
    .limit(1);
  if (!existing || existing.eventId !== ctx.event.id) {
    return { error: "That speaker could not be found." };
  }

  const parsed = speakerSchema.safeParse(speakerFormData(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  await db
    .update(speakers)
    .set({
      fullName: parsed.data.fullName,
      title: optional(parsed.data.title),
      institution: optional(parsed.data.institution),
      topic: optional(parsed.data.topic),
      citation: optional(parsed.data.citation),
      photoFileId: optional(parsed.data.photoFileId),
      backgroundFileId: optional(parsed.data.backgroundFileId),
      durationSeconds: parsed.data.durationSeconds,
      animation: parsed.data.animation,
      updatedAt: new Date(),
    })
    .where(eq(speakers.id, speakerId));

  await logAudit({
    eventId: ctx.event.id,
    userId: ctx.user.id,
    action: AUDIT_ACTIONS.speakerUpdated,
    details: { speakerId },
  });
  await publishEventUpdate(ctx.event.id);
  revalidateSummit();
  return { ok: true, message: "Speaker profile saved." };
}

export async function deleteSpeakerAction(formData: FormData) {
  const ctx = await adminContext();
  if (!ctx.ok) return;
  const speakerId = String(formData.get("speakerId") ?? "");
  const [existing] = await db
    .select()
    .from(speakers)
    .where(eq(speakers.id, speakerId))
    .limit(1);
  if (!existing || existing.eventId !== ctx.event.id) return;

  await db.delete(speakers).where(eq(speakers.id, speakerId));
  await logAudit({
    eventId: ctx.event.id,
    userId: ctx.user.id,
    action: AUDIT_ACTIONS.speakerDeleted,
    details: { speakerId, name: existing.fullName },
  });
  await publishEventUpdate(ctx.event.id);
  revalidateSummit();
}

export async function moveSpeakerAction(formData: FormData) {
  const ctx = await adminContext();
  if (!ctx.ok) return;
  const speakerId = String(formData.get("speakerId") ?? "");
  const direction = String(formData.get("direction") ?? "");
  if (direction !== "up" && direction !== "down") return;

  const list = await db
    .select()
    .from(speakers)
    .where(eq(speakers.eventId, ctx.event.id))
    .orderBy(asc(speakers.displayOrder), asc(speakers.createdAt));

  const index = list.findIndex((speaker) => speaker.id === speakerId);
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
        .update(speakers)
        .set({ displayOrder: position })
        .where(eq(speakers.id, reordered[position].id));
    }
  });
  revalidateSummit();
}
