"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { adminContext, revalidateSummit } from "@/lib/admin-context";
import { logAudit } from "@/lib/audit";
import { AUDIT_ACTIONS } from "@/lib/constants";
import { db } from "@/lib/db";
import { scenes } from "@/lib/db/schema";

const questionnaireSchema = z.object({
  eventId: z.string().uuid(),
  setupType: z.enum(["scenes", "speakers", "quiz", "all"]),
  openingTitle: z.string().trim().max(120),
  mainTopic: z.string().trim().max(120).optional(),
  closingTitle: z.string().trim().max(120),
  speakerNames: z.string().trim().optional(),
  quizQuestion: z.string().trim().optional(),
});

export async function createSetupQuestionnaireAction(_state: unknown, formData: FormData) {
  const ctx = await adminContext();
  if (!ctx.ok) {
    return { error: ctx.error };
  }

  const parsed = questionnaireSchema.safeParse({
    eventId: formData.get("eventId"),
    setupType: formData.get("setupType"),
    openingTitle: formData.get("openingTitle"),
    mainTopic: formData.get("mainTopic"),
    closingTitle: formData.get("closingTitle"),
    speakerNames: formData.get("speakerNames"),
    quizQuestion: formData.get("quizQuestion"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const { eventId, setupType, openingTitle, mainTopic, closingTitle, speakerNames, quizQuestion } = parsed.data;

  const createdSceneIds: string[] = [];

  // Create opening scene
  const [openingScene] = await db.transaction(async (tx) => {
    const [scene] = await tx
      .insert(scenes)
      .values({
        eventId,
        type: "opening",
        title: openingTitle,
        animation: "fade",
        displayOrder: 1,
        content: { 
          heading: openingTitle,
          body: mainTopic 
        },
      })
      .returning();
    createdSceneIds.push(scene.id);
    return [scene];
  });

  // Create topic scene if main topic provided
  if (mainTopic && mainTopic.trim().length > 0) {
    await db
      .insert(scenes)
      .values({
        eventId,
        type: "topic",
        title: mainTopic,
        animation: "fade",
        displayOrder: 2,
        content: { heading: mainTopic },
      });
  }

  // Create closing scene
  if (closingTitle && closingTitle.trim().length > 0) {
    await db
      .insert(scenes)
      .values({
        eventId,
        type: "closing",
        title: closingTitle,
        animation: "fade",
        displayOrder: 99,
        content: { heading: closingTitle },
      });
  }

  await logAudit({
    eventId,
    userId: ctx.user.id,
    action: AUDIT_ACTIONS.sceneCreated,
    details: { 
      count: createdSceneIds.length + (mainTopic ? 1 : 0),
      setupType,
    },
  });

  revalidateSummit();
  redirect("/admin?notice=setup-complete");
}