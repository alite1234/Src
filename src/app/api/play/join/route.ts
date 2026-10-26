import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { participants, quizSessions } from "@/lib/db/schema";
import { getEventById } from "@/lib/data/events";
import { getQuizBundle, quizSettings } from "@/lib/data/quiz";
import {
  PLAY_COOKIE,
  participantCookieOptions,
  signParticipantToken,
} from "@/lib/participant-token";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { publishSessionUpdate } from "@/lib/realtime/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  pin: z.string().trim().regex(/^\d{6}$/, "Enter the six-digit game PIN."),
  name: z
    .string()
    .trim()
    .min(2, "Use at least two characters for your name.")
    .max(40, "That name is too long."),
});

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  const limit = await checkRateLimit(`join:${ip}`, 30, 60);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many join attempts. Please wait a minute." },
      { status: 429 },
    );
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? (error.issues[0]?.message ?? "Check your details.")
        : "Check your details.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const name = body.name.replace(/\s+/g, " ").trim();
  if (!/^[\p{L}\p{N} .'’-]+$/u.test(name)) {
    return NextResponse.json(
      {
        error:
          "Names can contain letters, numbers, spaces, apostrophes and hyphens.",
      },
      { status: 400 },
    );
  }

  const [session] = await db
    .select()
    .from(quizSessions)
    .where(eq(quizSessions.pin, body.pin))
    .limit(1);

  if (!session) {
    return NextResponse.json(
      { error: "That game PIN was not found. Check the projector and try again." },
      { status: 404 },
    );
  }

  const event = await getEventById(session.eventId);
  if (!event || !event.isActive) {
    return NextResponse.json(
      { error: "This quiz is no longer open." },
      { status: 410 },
    );
  }

  const bundle = await getQuizBundle(session.quizId);
  if (!bundle) {
    return NextResponse.json(
      { error: "This quiz is unavailable." },
      { status: 410 },
    );
  }
  const settings = quizSettings(bundle.quiz);

  if (session.status === "ended") {
    return NextResponse.json(
      { error: "This quiz has already finished." },
      { status: 410 },
    );
  }

  if (session.status === "lobby" && !session.lobbyOpen) {
    return NextResponse.json(
      { error: "The lobby is closed. Ask the host to reopen it." },
      { status: 403 },
    );
  }

  if (session.status !== "lobby" && !settings.allowLateJoin) {
    return NextResponse.json(
      { error: "This quiz has already started and late joining is disabled." },
      { status: 403 },
    );
  }

  if (name.length > settings.maxNameLength) {
    return NextResponse.json(
      {
        error: `Names for this quiz can be at most ${settings.maxNameLength} characters.`,
      },
      { status: 400 },
    );
  }

  try {
    const [participant] = await db
      .insert(participants)
      .values({ sessionId: session.id, name })
      .returning();

    const token = await signParticipantToken({
      participantId: participant.id,
      sessionId: session.id,
      eventId: event.id,
      name: participant.name,
    });

    await publishSessionUpdate(event.id, session.id);

    const response = NextResponse.json({
      ok: true,
      participant: { id: participant.id, name: participant.name },
      sessionId: session.id,
    });
    response.cookies.set(PLAY_COOKIE, token, participantCookieOptions());
    return response;
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json(
        { error: "That name is already taken. Try another one." },
        { status: 409 },
      );
    }
    console.error("Join failed", error);
    return NextResponse.json(
      { error: "You could not join the quiz. Please try again." },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(PLAY_COOKIE, "", {
    ...participantCookieOptions(),
    maxAge: 0,
  });
  return response;
}
