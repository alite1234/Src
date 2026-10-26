import { NextRequest, NextResponse } from "next/server";

import { buildPlayState } from "@/lib/data/live";
import { getParticipantFromToken } from "@/lib/data/quiz";
import { readParticipantFromRequest } from "@/lib/participant-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = await readParticipantFromRequest(request);
  if (!token) {
    return NextResponse.json({ error: "Not joined." }, { status: 401 });
  }

  const participant = await getParticipantFromToken(
    token.participantId,
    token.sessionId,
  );
  if (!participant) {
    return NextResponse.json({ error: "Not joined." }, { status: 401 });
  }

  const payload = await buildPlayState(participant);
  if (!payload) {
    return NextResponse.json({ error: "Not joined." }, { status: 401 });
  }

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store" },
  });
}
