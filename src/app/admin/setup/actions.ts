"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { adminContext, revalidateSummit } from "@/lib/admin-context";
import { logAudit } from "@/lib/audit";
import { AUDIT_ACTIONS } from "@/lib/constants";
import { db } from "@/lib/db";
import { scenes } from "@/lib/db/schema";

const setupSchema = z.object({
  eventId: z.string().uuid(),
  speakers: z.string().optional(),
  prompt1: z.string().trim().max(120).optional(),
  prompt2: z.string().trim().max(120).optional(),
  prompt3: z.string().trim().max(120).optional(),
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
    details: { count: sceneTitles.filter((t) => t?.length > 2) },
  });

  revalidateSummit();
  redirect("/admin?notice=setup-complete");
}