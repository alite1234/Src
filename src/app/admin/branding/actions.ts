"use server";

import { asc, count, eq } from "drizzle-orm";
import { z } from "zod";

import { adminContext, revalidateSummit } from "@/lib/admin-context";
import { logAudit } from "@/lib/audit";
import {
  AUDIT_ACTIONS,
  VISIBILITY_KEYS,
} from "@/lib/constants";
import { db } from "@/lib/db";
import { eventLogos, events } from "@/lib/db/schema";
import { publishEventUpdate } from "@/lib/realtime/server";
import type { ActionState } from "@/lib/action-state";
import type {
  LogoLayout,
  LogoVisibility,
  VisibilityKey,
} from "@/lib/types";

const layouts = [
  "primary",
  "row",
  "balanced",
  "footer",
  "corners",
] as const satisfies readonly LogoLayout[];

const brandingSchema = z.object({
  logoLayout: z.enum(layouts),
  logoDefault: z.boolean(),
});

async function logosForEvent(eventId: string) {
  return db
    .select()
    .from(eventLogos)
    .where(eq(eventLogos.eventId, eventId))
    .orderBy(asc(eventLogos.displayOrder), asc(eventLogos.createdAt));
}

export async function updateBrandingAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await adminContext();
  if (!ctx.ok) return { error: ctx.error };

  const parsed = brandingSchema.safeParse({
    logoLayout: String(formData.get("logoLayout") ?? "primary"),
    logoDefault: formData.get("logoDefault") === "on",
  });
  if (!parsed.success) return { error: "Choose a valid logo layout." };

  const [total] = await db
    .select({ value: count(eventLogos.id) })
    .from(eventLogos)
    .where(eq(eventLogos.eventId, ctx.event.id));
  if (Number(total?.value ?? 0) === 0) {
    return { error: "Upload at least one logo before saving branding." };
  }

  const scenes: Partial<Record<VisibilityKey, boolean>> = {};
  for (const { key } of VISIBILITY_KEYS) {
    const value = String(formData.get(`visibility_${key}`) ?? "inherit");
    if (value === "show") scenes[key] = true;
    if (value === "hide") scenes[key] = false;
  }

  const logoVisibility: LogoVisibility = {
    default: parsed.data.logoDefault,
    scenes,
  };

  await db
    .update(events)
    .set({
      logoLayout: parsed.data.logoLayout,
      logoVisibility,
      updatedAt: new Date(),
    })
    .where(eq(events.id, ctx.event.id));

  await logAudit({
    eventId: ctx.event.id,
    userId: ctx.user.id,
    action: AUDIT_ACTIONS.eventUpdated,
    details: {
      logoLayout: parsed.data.logoLayout,
      logoVisibility,
    },
  });
  await publishEventUpdate(ctx.event.id);
  revalidateSummit();
  return { ok: true, message: "Branding and visibility saved." };
}

export async function setPrimaryLogoAction(formData: FormData) {
  const ctx = await adminContext();
  if (!ctx.ok) return;
  const logoId = String(formData.get("logoId") ?? "");

  await db.transaction(async (tx) => {
    const [logo] = await tx
      .select()
      .from(eventLogos)
      .where(eq(eventLogos.id, logoId))
      .limit(1);
    if (!logo || logo.eventId !== ctx.event.id) return;
    await tx
      .update(eventLogos)
      .set({ isPrimary: false })
      .where(eq(eventLogos.eventId, ctx.event.id));
    await tx
      .update(eventLogos)
      .set({ isPrimary: true, enabled: true })
      .where(eq(eventLogos.id, logoId));
  });

  await logAudit({
    eventId: ctx.event.id,
    userId: ctx.user.id,
    action: AUDIT_ACTIONS.logoUpdated,
    details: { logoId, primary: true },
  });
  await publishEventUpdate(ctx.event.id);
  revalidateSummit();
}

export async function toggleLogoAction(formData: FormData) {
  const ctx = await adminContext();
  if (!ctx.ok) return;
  const logoId = String(formData.get("logoId") ?? "");
  const [logo] = await db
    .select()
    .from(eventLogos)
    .where(eq(eventLogos.id, logoId))
    .limit(1);
  if (!logo || logo.eventId !== ctx.event.id) return;

  if (logo.isPrimary && logo.enabled) return;

  await db
    .update(eventLogos)
    .set({ enabled: !logo.enabled })
    .where(eq(eventLogos.id, logoId));
  await publishEventUpdate(ctx.event.id);
  revalidateSummit();
}

export async function renameLogoAction(formData: FormData) {
  const ctx = await adminContext();
  if (!ctx.ok) return;
  const logoId = String(formData.get("logoId") ?? "");
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  if (!name) return;
  const [logo] = await db
    .select()
    .from(eventLogos)
    .where(eq(eventLogos.id, logoId))
    .limit(1);
  if (!logo || logo.eventId !== ctx.event.id) return;

  await db.update(eventLogos).set({ name }).where(eq(eventLogos.id, logoId));
  await publishEventUpdate(ctx.event.id);
  revalidateSummit();
}

export async function moveLogoAction(formData: FormData) {
  const ctx = await adminContext();
  if (!ctx.ok) return;
  const logoId = String(formData.get("logoId") ?? "");
  const direction = String(formData.get("direction") ?? "");
  if (direction !== "up" && direction !== "down") return;

  const logos = await logosForEvent(ctx.event.id);
  const index = logos.findIndex((logo) => logo.id === logoId);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= logos.length) return;

  const reordered = [...logos];
  [reordered[index], reordered[target]] = [
    reordered[target],
    reordered[index],
  ];

  await db.transaction(async (tx) => {
    for (let position = 0; position < reordered.length; position += 1) {
      await tx
        .update(eventLogos)
        .set({ displayOrder: position })
        .where(eq(eventLogos.id, reordered[position].id));
    }
  });

  await publishEventUpdate(ctx.event.id);
  revalidateSummit();
}

export async function removeLogoAction(formData: FormData) {
  const ctx = await adminContext();
  if (!ctx.ok) return;
  const logoId = String(formData.get("logoId") ?? "");
  const logos = await logosForEvent(ctx.event.id);
  const logo = logos.find((item) => item.id === logoId);
  if (!logo) return;

  if (logos.length <= 1) {
    // The summit must always retain at least one logo once branding begins.
    return;
  }

  await db.transaction(async (tx) => {
    await tx.delete(eventLogos).where(eq(eventLogos.id, logoId));
    const remaining = logos.filter((item) => item.id !== logoId);
    for (let position = 0; position < remaining.length; position += 1) {
      await tx
        .update(eventLogos)
        .set({ displayOrder: position })
        .where(eq(eventLogos.id, remaining[position].id));
    }
    if (logo.isPrimary && remaining.length > 0) {
      await tx
        .update(eventLogos)
        .set({ isPrimary: true, enabled: true })
        .where(eq(eventLogos.id, remaining[0].id));
    }
  });

  await logAudit({
    eventId: ctx.event.id,
    userId: ctx.user.id,
    action: AUDIT_ACTIONS.logoRemoved,
    details: { logoId, name: logo.name },
  });
  await publishEventUpdate(ctx.event.id);
  revalidateSummit();
}
