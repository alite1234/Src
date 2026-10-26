"use server";

import { and, count, desc, eq, ne, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { db } from "@/lib/db";
import { eventLogos, events, liveState, users } from "@/lib/db/schema";
import { getActiveEvent } from "@/lib/data/events";
import { getApiUser } from "@/lib/auth/guards";
import { revalidateSummit, adminContext } from "@/lib/admin-context";
import { logAudit } from "@/lib/audit";
import { AUDIT_ACTIONS, THEME_LIST } from "@/lib/constants";
import { publishEventUpdate } from "@/lib/realtime/server";
import type { ActionState } from "@/lib/action-state";
import type { AnimationPreset, LogoLayout, ThemeId } from "@/lib/types";

const animationValues = [
  "fade",
  "slide",
  "rise",
  "zoom",
  "reveal",
  "spotlight",
] as const satisfies readonly AnimationPreset[];

const logoLayoutValues = [
  "primary",
  "row",
  "balanced",
  "footer",
  "corners",
] as const satisfies readonly LogoLayout[];

const themeValues = THEME_LIST.map((theme) => theme.id) as [
  ThemeId,
  ...ThemeId[],
];

const eventSchema = z.object({
  title: z.string().trim().min(2, "A summit title is required.").max(120),
  subtitle: z.string().trim().max(180).optional(),
  eventDate: z.string().trim().optional(),
  venue: z.string().trim().max(180).optional(),
  description: z.string().trim().max(4000).optional(),
  openingMessage: z.string().trim().max(2000).optional(),
  closingMessage: z.string().trim().max(2000).optional(),
  theme: z.enum(themeValues),
  animationStyle: z.enum(animationValues),
  logoLayout: z.enum(logoLayoutValues),
  status: z.enum(["draft", "ready", "live", "archived"]),
});

function textOrNull(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function eventFormData(formData: FormData) {
  return {
    title: String(formData.get("title") ?? ""),
    subtitle: String(formData.get("subtitle") ?? ""),
    eventDate: String(formData.get("eventDate") ?? ""),
    venue: String(formData.get("venue") ?? ""),
    description: String(formData.get("description") ?? ""),
    openingMessage: String(formData.get("openingMessage") ?? ""),
    closingMessage: String(formData.get("closingMessage") ?? ""),
    theme: String(formData.get("theme") ?? "navy-gold"),
    animationStyle: String(formData.get("animationStyle") ?? "fade"),
    logoLayout: String(formData.get("logoLayout") ?? "primary"),
    status: String(formData.get("status") ?? "draft"),
  };
}

async function logoCount(eventId: string) {
  const [row] = await db
    .select({ value: count(eventLogos.id) })
    .from(eventLogos)
    .where(eq(eventLogos.eventId, eventId));
  return Number(row?.value ?? 0);
}

export async function createEventAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getApiUser(["admin"]);
  if (!user) return { error: "You do not have administrator access." };

  const parsed = eventSchema.safeParse(eventFormData(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const existing = await db
    .select({ id: events.id })
    .from(events)
    .limit(1);

  const [created] = await db
    .insert(events)
    .values({
      title: parsed.data.title,
      subtitle: textOrNull(parsed.data.subtitle),
      eventDate: textOrNull(parsed.data.eventDate),
      venue: textOrNull(parsed.data.venue),
      description: textOrNull(parsed.data.description),
      openingMessage: textOrNull(parsed.data.openingMessage),
      closingMessage: textOrNull(parsed.data.closingMessage),
      theme: parsed.data.theme,
      animationStyle: parsed.data.animationStyle,
      logoLayout: parsed.data.logoLayout,
      status: parsed.data.status,
      isActive: existing.length === 0,
    })
    .returning();

  await db
    .insert(liveState)
    .values({ eventId: created.id })
    .onConflictDoNothing();

  await logAudit({
    eventId: created.id,
    userId: user.id,
    action: AUDIT_ACTIONS.eventCreated,
    details: { title: created.title },
  });

  revalidateSummit();
  redirect("/admin/branding");
}

export async function updateEventAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await adminContext();
  if (!ctx.ok) return { error: ctx.error };

  const eventId = String(formData.get("eventId") ?? "");
  if (eventId !== ctx.event.id) {
    return { error: "This summit is not the active summit." };
  }

  const parsed = eventSchema.safeParse(eventFormData(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  if (parsed.data.status !== "draft" && (await logoCount(eventId)) === 0) {
    return {
      error:
        "Upload at least one logo before marking the summit ready or live.",
    };
  }

  await db
    .update(events)
    .set({
      title: parsed.data.title,
      subtitle: textOrNull(parsed.data.subtitle),
      eventDate: textOrNull(parsed.data.eventDate),
      venue: textOrNull(parsed.data.venue),
      description: textOrNull(parsed.data.description),
      openingMessage: textOrNull(parsed.data.openingMessage),
      closingMessage: textOrNull(parsed.data.closingMessage),
      theme: parsed.data.theme,
      animationStyle: parsed.data.animationStyle,
      logoLayout: parsed.data.logoLayout,
      status: parsed.data.status,
      updatedAt: new Date(),
    })
    .where(eq(events.id, eventId));

  await logAudit({
    eventId,
    userId: ctx.user.id,
    action: AUDIT_ACTIONS.eventUpdated,
    details: { title: parsed.data.title, status: parsed.data.status },
  });

  await publishEventUpdate(eventId);
  revalidateSummit();
  return { ok: true, message: "Summit settings saved." };
}

export async function activateEventAction(formData: FormData) {
  const user = await getApiUser(["admin"]);
  if (!user) return;
  const eventId = String(formData.get("eventId") ?? "");
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  if (!event) return;
  if ((await logoCount(eventId)) === 0) {
    redirect("/admin?notice=logo-required");
  }

  await db.transaction(async (tx) => {
    await tx.update(events).set({ isActive: false });
    await tx
      .update(events)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(events.id, eventId));
    await tx
      .insert(liveState)
      .values({ eventId })
      .onConflictDoNothing();
  });

  await logAudit({
    eventId,
    userId: user.id,
    action: AUDIT_ACTIONS.eventActivated,
    details: { title: event.title },
  });
  await publishEventUpdate(eventId);
  revalidateSummit();
  redirect("/admin");
}

export async function deleteEventAction(formData: FormData) {
  const user = await getApiUser(["admin"]);
  if (!user) return;
  const eventId = String(formData.get("eventId") ?? "");
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  if (!event) return;

  await db.delete(events).where(eq(events.id, eventId));

  if (event.isActive) {
    const [next] = await db
      .select({ id: events.id })
      .from(events)
      .orderBy(desc(events.updatedAt))
      .limit(1);
    if (next) {
      await db
        .update(events)
        .set({ isActive: true, updatedAt: new Date() })
        .where(eq(events.id, next.id));
    }
  }

  await logAudit({
    eventId: null,
    userId: user.id,
    action: "event.deleted",
    details: { title: event.title },
  });
  revalidateSummit();
  redirect("/admin");
}

const userSchema = z.object({
  name: z.string().trim().min(2, "A name is required.").max(100),
  email: z.string().trim().toLowerCase().email("A valid email is required."),
  password: z
    .string()
    .min(8, "Passwords must be at least 8 characters.")
    .max(200),
  role: z.enum(["admin", "controller"]),
});

export async function createUserAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getApiUser(["admin"]);
  if (!user) return { error: "You do not have administrator access." };

  const parsed = userSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    role: String(formData.get("role") ?? "controller"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(sql`lower(${users.email})`, parsed.data.email))
    .limit(1);
  if (existing.length > 0) {
    return { error: "An account with that email already exists." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const [created] = await db
    .insert(users)
    .values({
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      role: parsed.data.role,
    })
    .returning();

  const event = await getActiveEvent();
  await logAudit({
    eventId: event?.id,
    userId: user.id,
    action: "user.created",
    details: { email: created.email, role: created.role },
  });
  revalidateSummit();
  return { ok: true, message: `${created.name} can now sign in.` };
}

export async function updateUserRoleAction(formData: FormData) {
  const admin = await getApiUser(["admin"]);
  if (!admin) return;
  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "");
  if (role !== "admin" && role !== "controller") return;
  if (userId === admin.id) {
    redirect("/admin/users?notice=role-self");
  }
  if (role === "controller") {
    const [remainingAdmins] = await db
      .select({ value: count(users.id) })
      .from(users)
      .where(and(eq(users.role, "admin"), ne(users.id, userId)));
    if (Number(remainingAdmins?.value ?? 0) === 0) {
      redirect("/admin/users?notice=last-admin");
    }
  }
  await db.update(users).set({ role }).where(eq(users.id, userId));
  await logAudit({
    userId: admin.id,
    action: "user.role_changed",
    details: { userId, role },
  });
  revalidateSummit();
  redirect("/admin/users");
}

export async function deleteUserAction(formData: FormData) {
  const admin = await getApiUser(["admin"]);
  if (!admin) return;
  const userId = String(formData.get("userId") ?? "");
  if (userId === admin.id) {
    redirect("/admin/users?notice=delete-self");
  }
  const [target] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!target) redirect("/admin/users");
  if (target.role === "admin") {
    const [remainingAdmins] = await db
      .select({ value: count(users.id) })
      .from(users)
      .where(and(eq(users.role, "admin"), ne(users.id, userId)));
    if (Number(remainingAdmins?.value ?? 0) === 0) {
      redirect("/admin/users?notice=last-admin");
    }
  }
  await db.delete(users).where(eq(users.id, userId));
  await logAudit({
    userId: admin.id,
    action: "user.deleted",
    details: { email: target.email, role: target.role },
  });
  revalidateSummit();
  redirect("/admin/users");
}

export async function resetUserPasswordAction(formData: FormData) {
  const admin = await getApiUser(["admin"]);
  if (!admin) return;
  const userId = String(formData.get("userId") ?? "");
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) {
    redirect("/admin/users?notice=password-short");
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
  await logAudit({
    userId: admin.id,
    action: "user.password_reset",
    details: { userId },
  });
  redirect("/admin/users?notice=password-updated");
}

