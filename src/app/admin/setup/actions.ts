"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";

import { adminContext, revalidateSummit } from "@/lib/admin-context";
import { logAudit } from "@/lib/audit";
import { AUDIT_ACTIONS } from "@/lib/constants";
import { db } from "@/lib/db";
import { events, scenes } from "@/lib/db/schema";
import type { AnimationPreset, SceneType, SceneTypeDefaults } from "@/lib/types";

const setupSchema = z.object({
  eventId: z.string().uuid(),
  speakers: z.string().optional(),
  prompt1: z.string().trim().max(120).optional(),
  prompt2: z.string().trim().max(120).optional(),
  prompt3: z.string().trim().max(120).optional(),
});

const creatableTypes = [
  "opening",
  "welcome",
  "speaker_intro",
  "citation",
  "speaking_now",
  "topic",
  "announcement",
  "countdown",
  "quiz_intro",
  "scoreboard",
  "fixtures",
  "break",
  "closing",
  "image_topic",
] as SceneType[];

const sceneDefaultsSchema = z.object({
  eventId: z.string().uuid(),
  defaults: z.record(
    z.string(),
    z.object({
      title: z.string().trim().max(120).optional(),
      heading: z.string().trim().max(180).optional(),
      subheading: z.string().trim().max(240).optional(),
      body: z.string().trim().max(5000).optional(),
      footer: z.string().trim().max(240).optional(),
      animation: z.enum([
        "fade",
        "slide",
        "rise",
        "zoom",
        "reveal",
        "spotlight",
      ] as const).optional(),
      durationSeconds: z
        .string()
        .trim()
        .optional()
        .refine(
          (value) => (value ?? "") === "" || /^\d+$/.test(value ?? ""),
          "Duration must be a whole number."
        ),
      logoMode: z.enum(["inherit", "show", "hide"]).optional(),
    })
  ),
});

export async function createSetupAction(_state: unknown, formData: FormData) {
  const ctx = await adminContext();
  if (!ctx.ok) {
    return { error: ctx.error };
  }

  const parsed = setupSchema.safeParse({
    eventId: formData.get("eventId"),
    speakers: formData.get("speakers"),
    prompt1: formData.get("prompt1"),
    prompt2: formData.get("prompt2"),
    prompt3: formData.get("prompt3"),
  });

  if (!parsed.success) {
    return { error: "Check the form data." };
  }

  // Parse speaker names
  const speakerNames = parsed.data.speakers
    ?.split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  // Create prompt scenes
  const sceneTitles = [parsed.data.prompt1, parsed.data.prompt2, parsed.data.prompt3];
  
  for (let i = 0; i < sceneTitles.length; i++) {
    const title = sceneTitles[i]?.slice(0, 120);
    if (title && title.length > 2) {
      await db.insert(scenes).values({
        eventId: parsed.data.eventId,
        type: i === 0 ? "opening" : "topic",
        title,
        animation: "fade",
        displayOrder: i + 10,
        content: { heading: title },
      });
    }
  }

  await logAudit({
    eventId: parsed.data.eventId,
    userId: ctx.user.id,
    action: AUDIT_ACTIONS.sceneCreated,
    details: { count: sceneTitles.filter((t) => (t?.length ?? 0) > 2) },
  });

  revalidateSummit();
  redirect("/admin?notice=setup-complete");
}

export async function updateSceneDefaultsAction(
  _state: unknown,
  formData: FormData,
) {
  const ctx = await adminContext();
  if (!ctx.ok) {
    return { error: ctx.error };
  }

  const eventId = String(formData.get("eventId") ?? "");
  if (!eventId || !/^[0-9a-f-]{36}$/i.test(eventId)) {
    return { error: "A valid summit is required." };
  }

  // Rebuild defaults map from form fields named defaults_<type>_<field>
  const defaults: Record<string, Record<string, unknown>> = {};
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("defaults_")) continue;
    const rest = key.slice("defaults_".length);
    const lastUnderscore = rest.lastIndexOf("_");
    if (lastUnderscore <= 0) continue;
    const type = rest.slice(0, lastUnderscore);
    const field = rest.slice(lastUnderscore + 1);
    if (!creatableTypes.includes(type as SceneType)) continue;
    if (!defaults[type]) defaults[type] = {};
    defaults[type][field] = typeof value === "string" ? value : String(value);
  }

  // Normalize empty strings to undefined and coerce durationSeconds
  const cleaned: Record<string, SceneTypeDefaults> = {};
  for (const [type, fields] of Object.entries(defaults)) {
    const cleanedFields: Record<string, unknown> = {};
    for (const [field, val] of Object.entries(fields)) {
      if (val === "") continue;
      cleanedFields[field] = val;
    }
    if (cleanedFields.durationSeconds !== undefined) {
      cleanedFields.durationSeconds = Number(cleanedFields.durationSeconds);
    }
    if (Object.keys(cleanedFields).length > 0) {
      cleaned[type] = cleanedFields as SceneTypeDefaults;
    }
  }

  await db
    .update(events)
    .set({ sceneDefaults: cleaned, updatedAt: new Date() })
    .where(eq(events.id, eventId));

  await logAudit({
    eventId,
    userId: ctx.user.id,
    action: AUDIT_ACTIONS.eventUpdated,
    details: { sceneDefaults: defaults },
  });
  revalidateSummit();
  return { ok: true, message: "Screen type defaults saved." };
}