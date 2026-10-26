import { eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { events, liveState, type LiveState } from "@/lib/db/schema";
import { getPublicSceneById } from "@/lib/data/events";
import {
  publishEventUpdate,
  publishSessionUpdate,
} from "@/lib/realtime/server";

type LivePatch = Partial<
  Omit<LiveState, "eventId" | "revision" | "updatedAt">
>;

export async function updateLiveState(eventId: string, patch: LivePatch) {
  const now = new Date();
  const [row] = await db
    .insert(liveState)
    .values({
      eventId,
      ...patch,
      revision: 1,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: liveState.eventId,
      set: {
        ...patch,
        revision: sql`${liveState.revision} + 1`,
        updatedAt: now,
      },
    })
    .returning();
  return row ?? null;
}

export async function publishSceneNow(
  eventId: string,
  sceneId: string,
): Promise<LiveState | null> {
  const scene = await getPublicSceneById(eventId, sceneId);
  if (!scene) return null;

  const row = await updateLiveState(eventId, {
    mode: "scene",
    sceneId,
    sceneSnapshot: scene,
    ...(scene.type === "scoreboard"
      ? { scoreboardRevealCount: 0, scoreboardShowAll: false }
      : {}),
  });
  await publishEventUpdate(eventId);
  return row;
}

export async function setLiveMode(
  eventId: string,
  mode: LiveState["mode"],
  extra: LivePatch = {},
) {
  const row = await updateLiveState(eventId, { mode, ...extra });
  await publishEventUpdate(eventId);
  return row;
}

export async function touchEvent(eventId: string) {
  await db
    .update(events)
    .set({ updatedAt: new Date() })
    .where(eq(events.id, eventId));
}

export async function notifyQuiz(
  eventId: string,
  sessionId: string | null | undefined,
) {
  if (sessionId) {
    await publishSessionUpdate(eventId, sessionId);
  } else {
    await publishEventUpdate(eventId);
  }
}
