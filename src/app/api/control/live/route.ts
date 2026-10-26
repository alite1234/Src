import { z } from "zod";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { getApiUser } from "@/lib/auth/guards";
import { logAudit } from "@/lib/audit";
import { AUDIT_ACTIONS } from "@/lib/constants";
import { db } from "@/lib/db";
import { scenes } from "@/lib/db/schema";
import {
  getActiveEvent,
  getEventQueue,
  getEventScoreboard,
  getEventScenes,
} from "@/lib/data/events";
import {
  getLiveState,
  toPublicLiveState,
} from "@/lib/data/live";
import {
  publishSceneNow,
  setLiveMode,
  updateLiveState,
} from "@/lib/live-control";
import { publishEventUpdate } from "@/lib/realtime/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("publish"), sceneId: z.string().uuid() }),
  z.object({ action: z.literal("holding") }),
  z.object({ action: z.literal("blank") }),
  z.object({ action: z.literal("next") }),
  z.object({ action: z.literal("previous") }),
  z.object({
    action: z.literal("countdown_start"),
    seconds: z.number().int().min(1).max(7200),
    label: z.string().trim().max(80).optional(),
  }),
  z.object({ action: z.literal("countdown_pause") }),
  z.object({ action: z.literal("countdown_resume") }),
  z.object({ action: z.literal("countdown_reset") }),
  z.object({ action: z.literal("scoreboard_reveal_next") }),
  z.object({ action: z.literal("scoreboard_reveal_all") }),
  z.object({ action: z.literal("scoreboard_hide") }),
  z.object({ action: z.literal("show_scoreboard") }),
]);

async function loadEvent() {
  const user = await getApiUser(["admin", "controller"]);
  const event = await getActiveEvent();
  return { user, event };
}

export async function POST(request: Request) {
  const { user, event } = await loadEvent();
  if (!user) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }
  if (!event) {
    return NextResponse.json(
      { error: "No active summit was found." },
      { status: 400 },
    );
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { error: "Invalid projection command." },
      { status: 400 },
    );
  }

  const live = await getLiveState(event.id);

  switch (body.action) {
    case "publish": {
      const [scene] = await db
        .select({ id: scenes.id })
        .from(scenes)
        .where(
          and(eq(scenes.id, body.sceneId), eq(scenes.eventId, event.id)),
        )
        .limit(1);
      if (!scene) {
        return NextResponse.json(
          { error: "That scene could not be found in this summit." },
          { status: 404 },
        );
      }
      const row = await publishSceneNow(event.id, body.sceneId);
      if (!row) {
        return NextResponse.json(
          { error: "The scene could not be published." },
          { status: 400 },
        );
      }
      await logAudit({
        eventId: event.id,
        userId: user.id,
        action: AUDIT_ACTIONS.scenePublished,
        details: { sceneId: body.sceneId },
      });
      return NextResponse.json({
        ok: true,
        live: toPublicLiveState(row),
      });
    }

    case "holding": {
      const row = await setLiveMode(event.id, "holding");
      return NextResponse.json({
        ok: true,
        live: row ? toPublicLiveState(row) : null,
      });
    }

    case "blank": {
      const row = await setLiveMode(event.id, "blank");
      return NextResponse.json({
        ok: true,
        live: row ? toPublicLiveState(row) : null,
      });
    }

    case "next":
    case "previous": {
      const queue = await getEventQueue(event.id);
      if (queue.length === 0) {
        return NextResponse.json(
          { error: "Add scenes to the presentation queue first." },
          { status: 400 },
        );
      }
      let index = queue.findIndex((item) => item.sceneId === live?.sceneId);
      if (index < 0) index = body.action === "next" ? -1 : queue.length;
      const target =
        body.action === "next"
          ? queue[Math.min(queue.length - 1, index + 1)]
          : queue[Math.max(0, index - 1)];
      const row = await publishSceneNow(event.id, target.sceneId);
      await logAudit({
        eventId: event.id,
        userId: user.id,
        action: AUDIT_ACTIONS.scenePublished,
        details: { sceneId: target.sceneId, direction: body.action },
      });
      return NextResponse.json({
        ok: true,
        live: row ? toPublicLiveState(row) : null,
      });
    }

    case "countdown_start": {
      const endsAt = new Date(Date.now() + body.seconds * 1000);
      const row = await updateLiveState(event.id, {
        mode: "countdown",
        countdownLabel: body.label?.trim() || "Session begins in",
        countdownEndsAt: endsAt,
        countdownRemainingMs: null,
        countdownRunning: true,
      });
      await publishEventUpdate(event.id);
      return NextResponse.json({
        ok: true,
        live: row ? toPublicLiveState(row) : null,
      });
    }

    case "countdown_pause": {
      const remainingMs =
        live?.countdownRunning && live.countdownEndsAt
          ? Math.max(0, live.countdownEndsAt.getTime() - Date.now())
          : (live?.countdownRemainingMs ?? 0);
      const row = await updateLiveState(event.id, {
        countdownEndsAt: null,
        countdownRemainingMs: remainingMs,
        countdownRunning: false,
      });
      await publishEventUpdate(event.id);
      return NextResponse.json({
        ok: true,
        live: row ? toPublicLiveState(row) : null,
      });
    }

    case "countdown_resume": {
      const remainingMs = live?.countdownRemainingMs ?? 0;
      if (remainingMs <= 0) {
        return NextResponse.json(
          { error: "Start a countdown before resuming." },
          { status: 400 },
        );
      }
      const row = await updateLiveState(event.id, {
        countdownEndsAt: new Date(Date.now() + remainingMs),
        countdownRemainingMs: null,
        countdownRunning: true,
      });
      await publishEventUpdate(event.id);
      return NextResponse.json({
        ok: true,
        live: row ? toPublicLiveState(row) : null,
      });
    }

    case "countdown_reset": {
      const row = await updateLiveState(event.id, {
        mode: live?.sceneId || live?.sceneSnapshot ? "scene" : "holding",
        countdownEndsAt: null,
        countdownRemainingMs: null,
        countdownRunning: false,
      });
      await publishEventUpdate(event.id);
      return NextResponse.json({
        ok: true,
        live: row ? toPublicLiveState(row) : null,
      });
    }

    case "scoreboard_reveal_next": {
      const board = await getEventScoreboard(event.id);
      if (!board) {
        return NextResponse.json(
          { error: "No scoreboard is configured." },
          { status: 400 },
        );
      }
      const current = live?.scoreboardShowAll
        ? board.totalEntries
        : (live?.scoreboardRevealCount ?? 0);
      const next = Math.min(current + 1, board.totalEntries);
      const row = await updateLiveState(event.id, {
        scoreboardRevealCount: next,
        scoreboardShowAll: false,
      });
      await logAudit({
        eventId: event.id,
        userId: user.id,
        action: AUDIT_ACTIONS.scoreRevealed,
        details: { revealed: next, total: board.totalEntries },
      });
      await publishEventUpdate(event.id);
      return NextResponse.json({
        ok: true,
        live: row ? toPublicLiveState(row) : null,
      });
    }

    case "scoreboard_reveal_all": {
      const board = await getEventScoreboard(event.id);
      if (!board) {
        return NextResponse.json(
          { error: "No scoreboard is configured." },
          { status: 400 },
        );
      }
      const row = await updateLiveState(event.id, {
        scoreboardRevealCount: board.totalEntries,
        scoreboardShowAll: true,
      });
      await logAudit({
        eventId: event.id,
        userId: user.id,
        action: AUDIT_ACTIONS.scoreRevealed,
        details: { revealed: board.totalEntries, all: true },
      });
      await publishEventUpdate(event.id);
      return NextResponse.json({
        ok: true,
        live: row ? toPublicLiveState(row) : null,
      });
    }

    case "scoreboard_hide": {
      const row = await updateLiveState(event.id, {
        scoreboardRevealCount: 0,
        scoreboardShowAll: false,
      });
      await publishEventUpdate(event.id);
      return NextResponse.json({
        ok: true,
        live: row ? toPublicLiveState(row) : null,
      });
    }

    case "show_scoreboard": {
      const eventScenes = await getEventScenes(event.id);
      const scoreboardScene = eventScenes.find(
        (scene) => scene.type === "scoreboard",
      );
      if (!scoreboardScene) {
        return NextResponse.json(
          {
            error:
              "Create a scoreboard scene in the admin dashboard before showing results.",
          },
          { status: 400 },
        );
      }
      const row = await publishSceneNow(event.id, scoreboardScene.id);
      return NextResponse.json({
        ok: true,
        live: row ? toPublicLiveState(row) : null,
      });
    }
  }
}
