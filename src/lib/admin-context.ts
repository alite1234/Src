import { revalidatePath } from "next/cache";

import { getApiUser, type SessionUser } from "@/lib/auth/guards";
import { getActiveEvent } from "@/lib/data/events";
import type { Event } from "@/lib/db/schema";

export type AdminContext =
  | { ok: false; error: string }
  | { ok: true; user: SessionUser; event: Event };

export async function adminContext(): Promise<AdminContext> {
  const user = await getApiUser(["admin"]);
  if (!user) {
    return { ok: false, error: "You do not have administrator access." };
  }
  const event = await getActiveEvent();
  if (!event) {
    return {
      ok: false,
      error: "Create and activate a summit before using this section.",
    };
  }
  return { ok: true, user, event };
}

export function revalidateSummit() {
  const paths = [
    "/admin",
    "/admin/branding",
    "/admin/speakers",
    "/admin/scenes",
    "/admin/scoreboard",
    "/admin/fixtures",
    "/admin/quiz",
    "/admin/users",
    "/admin/audit",
    "/control",
    "/project",
    "/home",
  ];
  for (const path of paths) revalidatePath(path);
}
