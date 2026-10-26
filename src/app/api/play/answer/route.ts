import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import {
  participants,
  questions,
  quizSessions,
  responses,
} from "@/lib/db/schema";
import { getParticipantFromToken, quizSettings } from "@/lib/data/quiz";
import { getQuizBundle } from "@/lib/data/quiz";
import {
  readParticipantFromRequest,
} from "@/lib/participant-token";
import { checkRateLimit } from "@/lib/rate-limit";
import { publishSessionUpdate } from "@/lib/realtime/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  optionId: z.string().trim().min(1).max(80),
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

  const limit = await checkRateLimit(
    `answer:${participant.id}`,
    60,
    60,
  );
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many submissions. Slow down." },
      { status: 429 },
    );
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Choose an answer." }, { status: 400 });
  }

  try {
    const result = await db.transaction(async (tx) => {
      const [session] = await tx
        .select()
        .from(quizSessions)
        .where(eq(quizSessions.id, participant.sessionId))
        .for("update")
        .limit(1);

      if (!session) {
        return { error: "The game could not be found." as const, status: 404 };
      }
      if (session.status === "ended") {
        return { error: "This quiz has finished." as const, status: 410 };
      }
      if (session.status === "paused") {
        return { error: "The question is paused." as const, status: 409 };
      }
      if (session.status !== "question") {
        return { error: "Answers are closed for this question." as const, status: 409 };
      }
      if (!session.currentQuestionId || !session.questionEndsAt) {
        return { error: "There is no active question." as const, status: 409 };
      }

      const now = new Date();
      const graceMs = 400;
      if (now.getTime() > session.questionEndsAt.getTime() + graceMs) {
        return { error: "Time is up for this question." as const, status: 409 };
      }

      const [question] = await tx
        .select()
        .from(questions)
        .where(eq(questions.id, session.currentQuestionId))
        .limit(1);
      if (!question) {
        return { error: "The question could not be loaded." as const, status: 404 };
      }
      const option = question.options.find(
        (entry) => entry.id === body.optionId,
      );
      if (!option) {
        return { error: "That answer is not valid." as const, status: 400 };
      }

      const [existing] = await tx
        .select({ id: responses.id })
        .from(responses)
        .where(
          and(
            eq(responses.participantId, participant.id),
            eq(responses.questionId, question.id),
          ),
        )
        .limit(1);
      if (existing) {
        return {
          error: "You have already answered this question." as const,
          status: 409,
        };
      }

      const bundle = await getQuizBundle(session.quizId);
      const settings = bundle ? quizSettings(bundle.quiz) : null;

      const isCorrect = body.optionId === question.correctOptionId;
      const durationMs = question.durationSeconds * 1000;
      const remainingMs = Math.max(
        0,
        session.questionEndsAt.getTime() - now.getTime(),
      );
      const ratio = Math.min(1, remainingMs / durationMs);
      const speedBonus =
        isCorrect && settings?.speedBonus
          ? Math.round(
              question.points *
                (settings.speedBonusRatio ?? 0) *
                ratio,
            )
          : 0;
      const points = isCorrect ? question.points + speedBonus : 0;

      const responseMs = session.questionStartedAt
        ? Math.max(0, now.getTime() - session.questionStartedAt.getTime())
        : 0;

      await tx.insert(responses).values({
        sessionId: session.id,
        participantId: participant.id,
        questionId: question.id,
        optionId: body.optionId,
        isCorrect,
        points,
        responseMs,
      });

      await tx
        .update(participants)
        .set({
          score: sql`${participants.score} + ${points}`,
          lastSeenAt: now,
        })
        .where(eq(participants.id, participant.id));

      await tx
        .update(quizSessions)
        .set({
          submissionCount: sql`${quizSessions.submissionCount} + 1`,
          updatedAt: now,
        })
        .where(eq(quizSessions.id, session.id));

      return {
        ok: true as const,
        eventId: token.eventId,
        sessionId: session.id,
      };
    });

    if ("error" in result && result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }

    if (result.ok) {
      await publishSessionUpdate(result.eventId, result.sessionId);
    }

    return NextResponse.json({ ok: true, submitted: true });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json(
        { error: "You have already answered this question." },
        { status: 409 },
      );
    }
    console.error("Answer submission failed", error);
    return NextResponse.json(
      { error: "Your answer could not be submitted. Please try again." },
      { status: 500 },
    );
  }
}
