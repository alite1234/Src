import { NextRequest, NextResponse } from "next/server";

import { getApiUser } from "@/lib/auth/guards";
import { getActiveEvent } from "@/lib/data/events";
import { getSessionById } from "@/lib/data/quiz";
import { PLAY_COOKIE, verifyParticipantToken } from "@/lib/participant-token";
import {
  createRealtimeToken,
  eventChannel,
  hasAbly,
  sessionChannel,
} from "@/lib/realtime/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!hasAbly()) {
    return NextResponse.json(
      { error: "Realtime is not configured." },
      { status: 503 },
    );
  }

  const sessionId = request.nextUrl.searchParams.get("sessionId");

  if (sessionId) {
    const participant = await verifyParticipantToken(
      request.cookies.get(PLAY_COOKIE)?.value,
    );
    const session = await getSessionById(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    const user = await getApiUser(["admin", "controller"]);
    const participantAllowed =
      participant &&
      participant.sessionId === session.id &&
      participant.eventId === session.eventId;

    if (!user && !participantAllowed) {
      return NextResponse.json({ error: "Not authorised." }, { status: 403 });
    }

    const channels = [sessionChannel(session.id)];
    const tokenRequest = await createRealtimeToken(
      channels,
      participantAllowed && participant
        ? `participant-${participant.participantId}`
        : `staff-${user?.id ?? "unknown"}`,
    );

    if (!tokenRequest) {
      return NextResponse.json(
        { error: "Realtime is not configured." },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { tokenRequest, channels, ttl: 60 * 60 },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const user = await getApiUser(["admin", "controller"]);
  const event = user ? await getActiveEvent() : await getActiveEvent();

  if (!event) {
    return NextResponse.json(
      { error: "No active summit was found." },
      { status: 404 },
    );
  }

  const channels = [eventChannel(event.id)];
  const tokenRequest = await createRealtimeToken(
    channels,
    user ? `staff-${user.id}` : `projector-${crypto.randomUUID()}`,
  );

  if (!tokenRequest) {
    return NextResponse.json(
      { error: "Realtime is not configured." },
      { status: 503 },
    );
  }

  return NextResponse.json(
    { tokenRequest, channels, ttl: 60 * 60 },
    { headers: { "Cache-Control": "no-store" } },
  );
}
