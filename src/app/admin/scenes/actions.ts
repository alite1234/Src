"use server";

import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";

import { adminContext, revalidateSummit } from "@/lib/admin-context";
import { logAudit } from "@/lib/audit";
import { AUDIT_ACTIONS, SCENE_TYPES } from "@/lib/constants";
import { db } from "@/lib/db";
import { sceneQueue, scenes, speakers } from "@/lib/db/schema";
import { getLiveState } from "@/lib/data/live";
import { publishEventUpdate } from "@/lib/realtime/server";
import { updateLiveState } from "@/lib/live-control";
import type { ActionState } from "@/lib/action-state";
import type {
  AnimationPreset,
  SceneContent,
  SceneLogoOverride,
  SceneType,
} from "@/lib/types";

const animations = [
  "fade",
  "slide",
  "rise",
  "zoom",
  "reveal",
  "spotlight",
] as const satisfies readonly AnimationPreset[];

const creatableTypes = SCENE_TYPES.filter((item) => item.creatable).map(
  (item) => item.value,
) as [SceneType, ...SceneType[]];

const SPEAKER_REQUIRED_TYPES: SceneType[] = [
  "speaker_intro",
  "speaking_now",
  "citation",
];

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const sceneSchema = z.object({
  type: z.enum(creatableTypes),
  title: z.string().trim().min(2, "A scene title is required.").max(120),
  speakerId: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || uuidPattern.test(value),
      "Choose a valid speaker.",
    ),
  backgroundFileId: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || uuidPattern.test(value),
      "Choose a valid background image.",
    ),
  animation: z.enum(animations),
  durationSeconds: z.preprocess(
    (value) =>
      value === "" || value === null || value === undefined
        ? null
        : Number(value),
    z.number().int().min(5).max(3600).nullable(),
  ),
  heading: z.string().trim().max(180).optional(),
  subheading: z.string().trim().max(240).optional(),
  body: z.string().trim().max(5000).optional(),
  footer: z.string().trim().max(240).optional(),
  logoMode: z.enum(["inherit", "show", "hide"]),
});

function formDataToScene(formData: FormData) {
  return {
    type: String(formData.get("type") ?? ""),
    title: String(formData.get("title") ?? ""),
    speakerId: String(formData.get("speakerId") ?? ""),
    backgroundFileId: String(formData.get("backgroundFileId") ?? ""),
    animation: String(formData.get("animation") ?? "fade"),
    durationSeconds: String(formData.get("durationSeconds") ?? ""),
    heading: String(formData.get("heading") ?? ""),
    subheading: String(formData.get("subheading") ?? ""),
    body: String(formData.get("body") ?? ""),
    footer: String(formData.get("footer") ?? ""),
    logoMode: String(formData.get("logoMode") ?? "inherit"),
  };
}

function optional(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function contentFrom(parsed: z.infer<typeof sceneSchema>): SceneContent {
  return {
    heading: optional(parsed.heading) ?? undefined,
    subheading: optional(parsed.subheading) ?? undefined,
    body: optional(parsed.body) ?? undefined,
    footer: optional(parsed.footer) ?? undefined,
  };
}

function logoOverrideFrom(
  parsed: z.infer<typeof sceneSchema>,
): SceneLogoOverride | null {
  if (parsed.logoMode === "inherit") return null;
  return { mode: parsed.logoMode };
}

async function validateSpeaker(
  eventId: string,
  speakerId: string | null | undefined,
): Promise<boolean> {
  if (!speakerId) return true;
  const [speaker] = await db
    .select({ id: speakers.id })
    .from(speakers)
    .where(and(eq(speakers.id, speakerId), eq(speakers.eventId, eventId)))
    .limit(1);
  return Boolean(speaker);
}

async function nextDisplayOrder(tx: Tx, eventId: string) {
  const [row] = await tx
    .select({
      value: sql<number>`coalesce(max(${scenes.displayOrder}), -1)`,
    })
    .from(scenes)
    .where(eq(scenes.eventId, eventId));
  return Number(row?.value ?? -1) + 1;
}

async function nextQueuePosition(tx: Tx, eventId: string) {
  const [row] = await tx
    .select({
      value: sql<number>`coalesce(max(${sceneQueue.position}), -1)`,
    })
    .from(sceneQueue)
    .where(eq(sceneQueue.eventId, eventId));
  return Number(row?.value ?? -1) + 1;
}

function positionCase(orderedIds: string[]) {
  return sql`case ${sql.join(
    orderedIds.map(
      (id, index) => sql`when ${sceneQueue.id} = ${id}::uuid then ${index}`,
    ),
    sql` `,
  )} else ${sceneQueue.position} end`;
}

async function renumberQueue(
  tx: Tx,
  eventId: string,
  orderedIds: string[],
) {
  if (orderedIds.length === 0) return;
  await tx
    .update(sceneQueue)
    .set({ position: positionCase(orderedIds) })
    .where(
      and(eq(sceneQueue.eventId, eventId), inArray(sceneQueue.id, orderedIds)),
    );
}

async function queueOrder(eventId: string) {
  const rows = await db
    .select({ id: sceneQueue.id })
    .from(sceneQueue)
    .where(eq(sceneQueue.eventId, eventId))
    .orderBy(asc(sceneQueue.position), asc(sceneQueue.createdAt));
  return rows.map((row) => row.id);
}

export async function createSceneAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await adminContext();
  if (!ctx.ok) return { error: ctx.error };

  const parsed = sceneSchema.safeParse(formDataToScene(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  if (
    SPEAKER_REQUIRED_TYPES.includes(parsed.data.type) &&
    !optional(parsed.data.speakerId)
  ) {
    return {
      error: "This scene type needs a speaker. Choose one from the list.",
    };
  }
  if (!(await validateSpeaker(ctx.event.id, optional(parsed.data.speakerId)))) {
    return { error: "That speaker does not belong to this summit." };
  }

  const [created] = await db.transaction(async (tx) => {
    const displayOrder = await nextDisplayOrder(tx, ctx.event.id);
    const [scene] = await tx
      .insert(scenes)
      .values({
        eventId: ctx.event.id,
        type: parsed.data.type,
        title: parsed.data.title,
        speakerId: optional(parsed.data.speakerId),
        backgroundFileId: optional(parsed.data.backgroundFileId),
        animation: parsed.data.animation,
        durationSeconds: parsed.data.durationSeconds,
        content: contentFrom(parsed.data),
        logoVisibility: logoOverrideFrom(parsed.data),
        displayOrder,
      })
      .returning();

    const position = await nextQueuePosition(tx, ctx.event.id);
    await tx.insert(sceneQueue).values({
      eventId: ctx.event.id,
      sceneId: scene.id,
      position,
    });

    return [scene];
  });

  await logAudit({
    eventId: ctx.event.id,
    userId: ctx.user.id,
    action: AUDIT_ACTIONS.sceneCreated,
    details: { sceneId: created.id, title: created.title, type: created.type },
  });
  revalidateSummit();
  return { ok: true, message: "Scene created and added to the queue." };
}

export async function updateSceneAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await adminContext();
  if (!ctx.ok) return { error: ctx.error };
  const sceneId = String(formData.get("sceneId") ?? "");

  const [existing] = await db
    .select()
    .from(scenes)
    .where(eq(scenes.id, sceneId))
    .limit(1);
  if (!existing || existing.eventId !== ctx.event.id) {
    return { error: "That scene could not be found." };
  }

  const parsed = sceneSchema.safeParse(formDataToScene(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  if (
    SPEAKER_REQUIRED_TYPES.includes(parsed.data.type) &&
    !optional(parsed.data.speakerId)
  ) {
    return {
      error: "This scene type needs a speaker. Choose one from the list.",
    };
  }
  if (!(await validateSpeaker(ctx.event.id, optional(parsed.data.speakerId)))) {
    return { error: "That speaker does not belong to this summit." };
  }

  await db
    .update(scenes)
    .set({
      type: parsed.data.type,
      title: parsed.data.title,
      speakerId: optional(parsed.data.speakerId),
      backgroundFileId: optional(parsed.data.backgroundFileId),
      animation: parsed.data.animation,
      durationSeconds: parsed.data.durationSeconds,
      content: contentFrom(parsed.data),
      logoVisibility: logoOverrideFrom(parsed.data),
      updatedAt: new Date(),
    })
    .where(eq(scenes.id, sceneId));

  await logAudit({
    eventId: ctx.event.id,
    userId: ctx.user.id,
    action: AUDIT_ACTIONS.sceneUpdated,
    details: { sceneId, title: parsed.data.title },
  });
  revalidateSummit();
  return {
    ok: true,
    message:
      "Scene saved. The audience is unaffected until the controller publishes it.",
  };
}

export async function deleteSceneAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await adminContext();
  if (!ctx.ok) return { error: ctx.error };
  const sceneId = String(formData.get("sceneId") ?? "");
  const [existing] = await db
    .select()
    .from(scenes)
    .where(eq(scenes.id, sceneId))
    .limit(1);
  if (!existing || existing.eventId !== ctx.event.id) {
    return { error: "That scene could not be found." };
  }

  const live = await getLiveState(ctx.event.id);
  const wasLive = live?.sceneId === sceneId;

  await db.transaction(async (tx) => {
    await tx.delete(scenes).where(eq(scenes.id, sceneId));
    const remainingIds = await tx
      .select({ id: sceneQueue.id })
      .from(sceneQueue)
      .where(eq(sceneQueue.eventId, ctx.event.id))
      .orderBy(asc(sceneQueue.position), asc(sceneQueue.createdAt));
    await renumberQueue(
      tx,
      ctx.event.id,
      remainingIds.map((row) => row.id),
    );
  });

  if (wasLive) {
    await updateLiveState(ctx.event.id, {
      mode: "holding",
      sceneId: null,
      sceneSnapshot: null,
    });
    await publishEventUpdate(ctx.event.id);
  }

  await logAudit({
    eventId: ctx.event.id,
    userId: ctx.user.id,
    action: AUDIT_ACTIONS.sceneDeleted,
    details: { sceneId, title: existing.title, wasLive },
  });
  revalidateSummit();
  return {
    ok: true,
    message: wasLive
      ? "Scene deleted. The projector returned to standby."
      : "Scene deleted.",
  };
}

export async function addSceneToQueueAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await adminContext();
  if (!ctx.ok) return { error: ctx.error };
  const sceneId = String(formData.get("sceneId") ?? "");
  const [scene] = await db
    .select()
    .from(scenes)
    .where(eq(scenes.id, sceneId))
    .limit(1);
  if (!scene || scene.eventId !== ctx.event.id) {
    return { error: "That scene could not be found." };
  }

  const [already] = await db
    .select({ id: sceneQueue.id })
    .from(sceneQueue)
    .where(
      and(
        eq(sceneQueue.eventId, ctx.event.id),
        eq(sceneQueue.sceneId, sceneId),
      ),
    )
    .limit(1);
  if (already) {
    return { error: "That scene is already in the queue." };
  }

  await db.transaction(async (tx) => {
    const position = await nextQueuePosition(tx, ctx.event.id);
    await tx.insert(sceneQueue).values({
      eventId: ctx.event.id,
      sceneId,
      position,
    });
  });
  await logAudit({
    eventId: ctx.event.id,
    userId: ctx.user.id,
    action: AUDIT_ACTIONS.queueUpdated,
    details: { sceneId, action: "added" },
  });
  revalidateSummit();
  return { ok: true, message: "Scene added to the queue." };
}

export async function removeSceneFromQueueAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await adminContext();
  if (!ctx.ok) return { error: ctx.error };
  const itemId = String(formData.get("itemId") ?? "");
  const [item] = await db
    .select()
    .from(sceneQueue)
    .where(eq(sceneQueue.id, itemId))
    .limit(1);
  if (!item || item.eventId !== ctx.event.id) {
    return { error: "That queue item could not be found." };
  }

  await db.transaction(async (tx) => {
    await tx.delete(sceneQueue).where(eq(sceneQueue.id, itemId));
    const remainingIds = await tx
      .select({ id: sceneQueue.id })
      .from(sceneQueue)
      .where(eq(sceneQueue.eventId, ctx.event.id))
      .orderBy(asc(sceneQueue.position), asc(sceneQueue.createdAt));
    await renumberQueue(
      tx,
      ctx.event.id,
      remainingIds.map((row) => row.id),
    );
  });

  await logAudit({
    eventId: ctx.event.id,
    userId: ctx.user.id,
    action: AUDIT_ACTIONS.queueUpdated,
    details: { sceneId: item.sceneId, action: "removed" },
  });
  revalidateSummit();
  return { ok: true, message: "Removed from the queue." };
}

export async function moveSceneInQueueAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await adminContext();
  if (!ctx.ok) return { error: ctx.error };
  const itemId = String(formData.get("itemId") ?? "");
  const direction = String(formData.get("direction") ?? "");
  if (direction !== "up" && direction !== "down") {
    return { error: "Unknown move direction." };
  }

  const orderedIds = await queueOrder(ctx.event.id);
  const index = orderedIds.indexOf(itemId);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= orderedIds.length) {
    return { error: "That queue item could not be moved." };
  }

  const reordered = [...orderedIds];
  [reordered[index], reordered[target]] = [
    reordered[target],
    reordered[index],
  ];

  await db.transaction(async (tx) => {
    await renumberQueue(tx, ctx.event.id, reordered);
  });
  await logAudit({
    eventId: ctx.event.id,
    userId: ctx.user.id,
    action: AUDIT_ACTIONS.queueUpdated,
    details: { itemId, direction },
  });
  revalidateSummit();
  return { ok: true };
}
