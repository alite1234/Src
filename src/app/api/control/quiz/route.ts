import { randomInt } from "node:crypto";

import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { getApiUser } from "@/lib/auth/guards";
import { logAudit } from "@/lib/audit";
import { AUDIT_ACTIONS } from "@/lib/constants";
import { db } from "@/lib/db";
import { quizSessions, type Question } from "@/lib/db/schema";
import { getActiveEvent } from "@/lib/data/events";
import {
  currentQuestionForSession,
  getQuizBundle,
  getSessionById,
  orderedQuestionIds,
  quizSettings,
} from "@/lib/data/quiz";
import { getLiveState } from "@/lib/data/live";
import { updateLiveState } from "@/lib/live-control";
import {
  publishEventUpdate,
  publishSessionUpdate,
} from "@/lib/realtime/server";
import { shuffle } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const activeStatuses = [
  "lobby",
  "question",
  "paused",
  "reveal",
  "leaderboard",
] as const;

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("launch"), quizId: z.string().uuid() }),
  z.object({ action: z.literal("open_lobby") }),
  z.object({ action: z.literal("close_lobby") }),
  z.object({
    action: z.literal("lobby_countdown"),
    seconds: z.number().int().min(0).max(600).optional(),
  }),
  z.object({ action: z.literal("start") }),
  z.object({ action: z.literal("pause") }),
  z.object({ action: z.literal("resume") }),
  z.object({
    action: z.literal("extend"),
    seconds: z.number().int().min(1).max(300).default(10),
  }),
  z.object({ action: z.literal("reset_timer") }),
  z.object({ action: z.literal("reveal") }),
  z.object({ action: z.literal("advance") }),
  z.object({ action: z.literal("leaderboard") }),
  z.object({ action: z.literal("end") }),
  z.object({ action: z.literal("return_to_summit") }),
]);

function jsonError(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

function validateQuestions(
  order: string[],
  questions: Question[],
): string | null {
  if (order.length === 0) return "Add at least one question before launching.";
  for (let index = 0; index < order.length; index += 1) {
    const question = questions.find((item) => item.id === order[index]);
    if (!question) return `Question ${index + 1} is missing.`;
    if (!question.prompt.trim()) return `Question ${index + 1} has no text.`;
    if (
      !Array.isArray(question.options) ||
      question.options.length < 2
    ) {
      return `Question ${index + 1} needs at least two answers.`;
    }
    if (
      !question.options.some(
        (option) => option.id === question.correctOptionId,
      )
    ) {
      return `Question ${index + 1} has no valid correct answer.`;
    }
    if (question.durationSeconds < 5) {
      return `Question ${index + 1} needs a timer of at least 5 seconds.`;
    }
  }
  return null;
}

async function generatePin() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const pin = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const [existing] = await db
      .select({ id: quizSessions.id })
      .from(quizSessions)
      .where(eq(quizSessions.pin, pin))
      .limit(1);
    if (!existing) return pin;
  }
  throw new Error("Unable to allocate a game PIN. Please try again.");
}

async function sessionContext(eventId: string) {
  const live = await getLiveState(eventId);
  if (!live?.quizSessionId) return { live, session: null, bundle: null };
  const session = await getSessionById(live.quizSessionId);
  if (!session || session.eventId !== eventId) {
    return { live, session: null, bundle: null };
  }
  const bundle = await getQuizBundle(session.quizId);
  return { live, session, bundle };
}

export async function POST(request: Request) {
  const user = await getApiUser(["admin", "controller"]);
  if (!user) return jsonError("Not authorised.", 403);

  const event = await getActiveEvent();
  if (!event) return jsonError("No active summit was found.");

  let body: z.infer<typeof actionSchema>;
  try {
    body = actionSchema.parse(await request.json());
  } catch {
    return jsonError("Invalid quiz command.");
  }

  const context = await sessionContext(event.id);

  if (body.action === "launch") {
    const [active] = await db
      .select({ id: quizSessions.id })
      .from(quizSessions)
      .where(
        and(
          eq(quizSessions.eventId, event.id),
          inArray(quizSessions.status, [...activeStatuses]),
        ),
      )
      .limit(1);
    if (active) {
      return jsonError("A quiz session is already running. End it first.");
    }

    const bundle = await getQuizBundle(body.quizId);
    if (!bundle || bundle.quiz.eventId !== event.id) {
      return jsonError("That quiz could not be found.", 404);
    }

    const settings = quizSettings(bundle.quiz);
    const baseOrder = bundle.questions.map((question) => question.id);
    const order = settings.randomizeQuestions
      ? shuffle(baseOrder)
      : baseOrder;

    const validation = validateQuestions(order, bundle.questions);
    if (validation) return jsonError(validation);

    const optionOrders: Record<string, string[]> = {};
    for (const question of bundle.questions) {
      const ids = question.options.map((option) => option.id);
      optionOrders[question.id] = settings.randomizeAnswers
        ? shuffle(ids)
        : ids;
    }

    const pin = await generatePin();
    const [session] = await db
      .insert(quizSessions)
      .values({
        eventId: event.id,
        quizId: bundle.quiz.id,
        pin,
        status: "lobby",
        lobbyOpen: true,
        currentQuestionIndex: 0,
        questionOrder: order,
        optionOrders,
        submissionCount: 0,
      })
      .returning();

    await updateLiveState(event.id, {
      mode: "quiz",
      quizSessionId: session.id,
    });
    await publishSessionUpdate(event.id, session.id);
    await logAudit({
      eventId: event.id,
      userId: user.id,
      action: AUDIT_ACTIONS.quizLaunched,
      details: { quizId: bundle.quiz.id, sessionId: session.id, pin },
    });

    return NextResponse.json({ ok: true, sessionId: session.id, pin });
  }

  if (!context.session || !context.bundle) {
    return jsonError("No quiz session is active.");
  }

  const { session, bundle } = context;
  const settings = quizSettings(bundle.quiz);
  const order = orderedQuestionIds(session, bundle.questions);
  const now = new Date();

  const finish = async (extra?: Record<string, unknown>) => {
    await publishSessionUpdate(event.id, session.id);
    return NextResponse.json({ ok: true, ...extra });
  };

  switch (body.action) {
    case "open_lobby":
    case "close_lobby": {
      if (session.status !== "lobby") {
        return jsonError("The lobby can only change while it is open.");
      }
      await db
        .update(quizSessions)
        .set({
          lobbyOpen: body.action === "open_lobby",
          updatedAt: now,
        })
        .where(eq(quizSessions.id, session.id));
      return finish();
    }

    case "lobby_countdown": {
      if (session.status !== "lobby") {
        return jsonError("Start the lobby before running a countdown.");
      }
      const seconds =
        body.seconds ?? settings.lobbyCountdownSeconds ?? 30;
      await db
        .update(quizSessions)
        .set({
          lobbyEndsAt:
            seconds > 0 ? new Date(now.getTime() + seconds * 1000) : null,
          lobbyOpen: true,
          updatedAt: now,
        })
        .where(eq(quizSessions.id, session.id));
      return finish();
    }

    case "start": {
      if (session.status !== "lobby") {
        return jsonError("The quiz has already started.");
      }
      const validation = validateQuestions(order, bundle.questions);
      if (validation) return jsonError(validation);
      const first = bundle.questions.find((item) => item.id === order[0]);
      if (!first) return jsonError("The first question could not be loaded.");

      await db
        .update(quizSessions)
        .set({
          status: "question",
          currentQuestionIndex: 0,
          currentQuestionId: first.id,
          questionStartedAt: now,
          questionEndsAt: new Date(
            now.getTime() + first.durationSeconds * 1000,
          ),
          remainingMs: null,
          submissionCount: 0,
          startedAt: now,
          lobbyOpen: false,
          lobbyEndsAt: null,
          updatedAt: now,
        })
        .where(eq(quizSessions.id, session.id));
      return finish();
    }

    case "pause": {
      if (session.status !== "question") {
        return jsonError("Only a running question can be paused.");
      }
      const remainingMs = session.questionEndsAt
        ? Math.max(0, session.questionEndsAt.getTime() - now.getTime())
        : 0;
      await db
        .update(quizSessions)
        .set({
          status: "paused",
          remainingMs,
          questionEndsAt: null,
          updatedAt: now,
        })
        .where(eq(quizSessions.id, session.id));
      return finish();
    }

    case "resume": {
      if (session.status !== "paused") {
        return jsonError("The question is not paused.");
      }
      const remainingMs = session.remainingMs ?? 0;
      await db
        .update(quizSessions)
        .set({
          status: "question",
          questionEndsAt: new Date(now.getTime() + remainingMs),
          remainingMs: null,
          updatedAt: now,
        })
        .where(eq(quizSessions.id, session.id));
      return finish();
    }

    case "extend": {
      if (session.status !== "question" && session.status !== "paused") {
        return jsonError("The timer can only change during a question.");
      }
      if (session.status === "paused") {
        await db
          .update(quizSessions)
          .set({
            remainingMs: (session.remainingMs ?? 0) + body.seconds * 1000,
            updatedAt: now,
          })
          .where(eq(quizSessions.id, session.id));
      } else {
        const currentEnd = session.questionEndsAt?.getTime() ?? now.getTime();
        await db
          .update(quizSessions)
          .set({
            questionEndsAt: new Date(currentEnd + body.seconds * 1000),
            updatedAt: now,
          })
          .where(eq(quizSessions.id, session.id));
      }
      return finish();
    }

    case "reset_timer": {
      if (session.status !== "question" && session.status !== "paused") {
        return jsonError("The timer can only change during a question.");
      }
      const question = currentQuestionForSession(
        session,
        bundle.questions,
      );
      if (!question) return jsonError("The current question is missing.");
      await db
        .update(quizSessions)
        .set({
          status: "question",
          questionEndsAt: new Date(
            now.getTime() + question.durationSeconds * 1000,
          ),
          remainingMs: null,
          updatedAt: now,
        })
        .where(eq(quizSessions.id, session.id));
      return finish();
    }

    case "reveal": {
      if (session.status !== "question" && session.status !== "paused") {
        return jsonError("There is no active question to reveal.");
      }
      await db
        .update(quizSessions)
        .set({
          status: "reveal",
          questionEndsAt: now,
          remainingMs: null,
          updatedAt: now,
        })
        .where(eq(quizSessions.id, session.id));
      return finish();
    }

    case "advance": {
      if (
        !["question", "paused", "reveal", "leaderboard"].includes(
          session.status,
        )
      ) {
        return jsonError("The quiz cannot advance from its current state.");
      }
      const nextIndex = session.currentQuestionIndex + 1;
      const nextQuestion = bundle.questions.find(
        (item) => item.id === order[nextIndex],
      );

      if (!nextQuestion) {
        await db
          .update(quizSessions)
          .set({
            status: "ended",
            endedAt: now,
            lobbyOpen: false,
            updatedAt: now,
          })
          .where(eq(quizSessions.id, session.id));
        await logAudit({
          eventId: event.id,
          userId: user.id,
          action: AUDIT_ACTIONS.quizEnded,
          details: { sessionId: session.id },
        });
        return finish({ ended: true });
      }

      await db
        .update(quizSessions)
        .set({
          status: "question",
          currentQuestionIndex: nextIndex,
          currentQuestionId: nextQuestion.id,
          questionStartedAt: now,
          questionEndsAt: new Date(
            now.getTime() + nextQuestion.durationSeconds * 1000,
          ),
          remainingMs: null,
          submissionCount: 0,
          updatedAt: now,
        })
        .where(eq(quizSessions.id, session.id));
      return finish({ ended: false, index: nextIndex });
    }

    case "leaderboard": {
      if (session.status === "ended") {
        return jsonError("The quiz has already ended.");
      }
      await db
        .update(quizSessions)
        .set({
          status: "leaderboard",
          questionEndsAt: now,
          remainingMs: null,
          updatedAt: now,
        })
        .where(eq(quizSessions.id, session.id));
      return finish();
    }

    case "end": {
      await db
        .update(quizSessions)
        .set({
          status: "ended",
          endedAt: now,
          lobbyOpen: false,
          updatedAt: now,
        })
        .where(eq(quizSessions.id, session.id));
      await logAudit({
        eventId: event.id,
        userId: user.id,
        action: AUDIT_ACTIONS.quizEnded,
        details: { sessionId: session.id },
      });
      return finish();
    }

    case "return_to_summit": {
      if (session.status !== "ended") {
        return jsonError("End the quiz before returning to the summit.");
      }
      const live = context.live;
      await updateLiveState(event.id, {
        mode: live?.sceneSnapshot ? "scene" : "holding",
        quizSessionId: null,
        countdownEndsAt: null,
        countdownRemainingMs: null,
        countdownRunning: false,
      });
      await publishEventUpdate(event.id);
      return NextResponse.json({ ok: true });
    }
  }
}
