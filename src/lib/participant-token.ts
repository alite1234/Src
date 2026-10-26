import { jwtVerify, SignJWT } from "jose";

import type { NextRequest } from "next/server";

export const PLAY_COOKIE = "src_play";

export type ParticipantToken = {
  participantId: string;
  sessionId: string;
  eventId: string;
  name: string;
};

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is not configured.");
  return new TextEncoder().encode(value);
}

export async function signParticipantToken(payload: ParticipantToken) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret());
}

export async function verifyParticipantToken(
  token: string | undefined | null,
): Promise<ParticipantToken | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (
      typeof payload.participantId !== "string" ||
      typeof payload.sessionId !== "string" ||
      typeof payload.eventId !== "string" ||
      typeof payload.name !== "string"
    ) {
      return null;
    }
    return {
      participantId: payload.participantId,
      sessionId: payload.sessionId,
      eventId: payload.eventId,
      name: payload.name,
    };
  } catch {
    return null;
  }
}

export async function readParticipantFromRequest(request: NextRequest) {
  return verifyParticipantToken(request.cookies.get(PLAY_COOKIE)?.value);
}

export function participantCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  };
}
