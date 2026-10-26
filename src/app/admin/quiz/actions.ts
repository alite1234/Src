"use server";

import { and, asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { adminContext, revalidateSummit } from "@/lib/admin-context";
import { logAudit } from "@/lib/audit";
import {
  AUDIT_ACTIONS,
  DEFAULT_QUIZ_SETTINGS,
} from "@/lib/constants";
import { db } from "@/lib/db";
import { questions, quizzes, quizSessions } from "@/lib/db/schema";
import { makeId } from "@/lib/utils";
import type { ActionState } from "@/lib/action-state";
import type { QuizOption, QuizSettings } from "@/lib/types";

const activeStatuses = [
  "lobby",
  "question",
  "paused",
  "reveal",
  "leaderboard",
] as const;

const quizSchema = z.object({
  title: z.string().trim().min(2, "A quiz title is required.").max(120),
  speedBonus: z.boolean(),
  speedBonusPercent: z.coerce.number().int().min(0).max(100),
  randomizeQuestions: z.boolean(),
  randomizeAnswers: z.boolean(),
  lobbyCountdownSeconds: z.coerce.number().int().min(0).max(600),
  allowLateJoin: z.boolean(),
  showLeaderboard: z.boolean(),
  maxNameLength: z.coerce.number().int().min(3).max(40),
  tieBreaker: z.enum(["time", "name"]),
});

function quizFormData(formData: FormData) {
  return {
    title: String(formData.get("title") ?? ""),
    speedBonus: formData.get("speedBonus") === "on",
    speedBonusPercent: String(formData.get("speedBonusPercent") ?? "50"),
    randomizeQuestions: formData.get("randomizeQuestions") === "on",
    randomizeAnswers: formData.get("randomizeAnswers") === "on",
    lobbyCountdownSeconds: String(formData.get("lobbyCountdownSeconds") ?? "30"),
    allowLateJoin: formData.get("allowLateJoin") === "on",
    showLeaderboard: formData.get("showLeaderboard") === "on",
    maxNameLength: String(formData.get("maxNameLength") ?? "20"),
    tieBreaker: String(formData.get("tieBreaker") ?? "time"),
  };
}

async function quizHasActiveSession(quizId: string) {
  const [row] = await db
    .select({ id: quizSessions.id })
    .from(quizSessions)
    .where(
      and(
        eq(quizSessions.quizId, quizId),
        inArray(quizSessions.status, [...activeStatuses]),
      ),
    )
    .limit(1);
  return Boolean(row);
}

async function getQuizForEvent(quizId: string, eventId: string) {
  const [quiz] = await db
    .select()
    .from(quizzes)
    .where(and(eq(quizzes.id, quizId), eq(quizzes.eventId, eventId)))
    .limit(1);
  return quiz ?? null;
}

export async function createQuizAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await adminContext();
  if (!ctx.ok) return { error: ctx.error };

  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  if (title.length < 2) return { error: "Enter a title for the quiz." };

  const [created] = await db
    .insert(quizzes)
    .values({
      eventId: ctx.event.id,
      title,
      settings: DEFAULT_QUIZ_SETTINGS,
    })
    .returning();

  await logAudit({
    eventId: ctx.event.id,
    userId: ctx.user.id,
    action: AUDIT_ACTIONS.quizUpdated,
    details: { quizId: created.id, title, created: true },
  });
  revalidateSummit();
  return { ok: true, message: "Quiz created. Add questions next." };
}

export async function updateQuizAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await adminContext();
  if (!ctx.ok) return { error: ctx.error };

  const quizId = String(formData.get("quizId") ?? "");
  const quiz = await getQuizForEvent(quizId, ctx.event.id);
  if (!quiz) return { error: "That quiz could not be found." };
  if (await quizHasActiveSession(quizId)) {
    return {
      error: "Quiz settings cannot change while a session is active.",
    };
  }

  const parsed = quizSchema.safeParse(quizFormData(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const settings: QuizSettings = {
    speedBonus: parsed.data.speedBonus,
    speedBonusRatio: parsed.data.speedBonusPercent / 100,
    randomizeQuestions: parsed.data.randomizeQuestions,
    randomizeAnswers: parsed.data.randomizeAnswers,
    lobbyCountdownSeconds: parsed.data.lobbyCountdownSeconds,
    allowLateJoin: parsed.data.allowLateJoin,
    showLeaderboard: parsed.data.showLeaderboard,
    maxNameLength: parsed.data.maxNameLength,
    tieBreaker: parsed.data.tieBreaker,
  };

  await db
    .update(quizzes)
    .set({
      title: parsed.data.title,
      settings,
      updatedAt: new Date(),
    })
    .where(eq(quizzes.id, quizId));

  await logAudit({
    eventId: ctx.event.id,
    userId: ctx.user.id,
    action: AUDIT_ACTIONS.quizUpdated,
    details: { quizId, title: parsed.data.title },
  });
  revalidateSummit();
  return { ok: true, message: "Quiz settings saved." };
}

type QuestionInput = {
  prompt: string;
  options: QuizOption[];
  correctOptionId: string;
  durationSeconds: number;
  points: number;
};

function parseQuestionForm(
  formData: FormData,
): { ok: true; value: QuestionInput } | { ok: false; error: string } {
  const prompt = String(formData.get("prompt") ?? "").trim();
  if (prompt.length < 3) {
    return { ok: false, error: "Enter the question text." };
  }

  const texts = [0, 1, 2, 3].map((index) =>
    String(formData.get(`option_${index}`) ?? "").trim(),
  );
  const hiddenIds = [0, 1, 2, 3].map((index) =>
    String(formData.get(`optionId_${index}`) ?? "").trim(),
  );
  const correctIndex = Number(formData.get("correct") ?? -1);

  if (
    !Number.isInteger(correctIndex) ||
    correctIndex < 0 ||
    correctIndex > 3
  ) {
    return { ok: false, error: "Select the correct answer." };
  }
  if (!texts[correctIndex]) {
    return { ok: false, error: "The correct answer cannot be blank." };
  }

  const meaningful = texts
    .map((text, index) => ({ text, index }))
    .filter((entry) => entry.text.length > 0);
  if (meaningful.length < 2) {
    return { ok: false, error: "Provide at least two answer options." };
  }

  const usedIds = new Set<string>();
  const options: QuizOption[] = meaningful.map(({ text, index }) => {
    let id = hiddenIds[index];
    if (!/^opt_[a-z0-9]{4,20}$/.test(id) || usedIds.has(id)) {
      id = makeId("opt");
      while (usedIds.has(id)) id = makeId("opt");
    }
    usedIds.add(id);
    return { id, text: text.slice(0, 240) };
  });

  const correctIndexInList = meaningful.findIndex(
    (entry) => entry.index === correctIndex,
  );
  const correctOptionId = options[correctIndexInList]?.id;
  if (!correctOptionId) {
    return { ok: false, error: "Select the correct answer." };
  }

  const durationSeconds = Number(formData.get("durationSeconds") ?? 20);
  const points = Number(formData.get("points") ?? 1000);

  if (
    !Number.isFinite(durationSeconds) ||
    durationSeconds < 5 ||
    durationSeconds > 300
  ) {
    return { ok: false, error: "Question timers must be 5–300 seconds." };
  }
  if (!Number.isFinite(points) || points < 0 || points > 100_000) {
    return { ok: false, error: "Points must be between 0 and 100,000." };
  }

  return {
    ok: true,
    value: {
      prompt: prompt.slice(0, 600),
      options,
      correctOptionId,
      durationSeconds: Math.round(durationSeconds),
      points: Math.round(points),
    },
  };
}

export async function createQuestionAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await adminContext();
  if (!ctx.ok) return { error: ctx.error };

  const quizId = String(formData.get("quizId") ?? "");
  const quiz = await getQuizForEvent(quizId, ctx.event.id);
  if (!quiz) return { error: "That quiz could not be found." };
  if (await quizHasActiveSession(quizId)) {
    return { error: "Questions cannot change while a session is active." };
  }

  const parsed = parseQuestionForm(formData);
  if (!parsed.ok) return { error: parsed.error };

  const existing = await db
    .select({ orderIndex: questions.orderIndex })
    .from(questions)
    .where(eq(questions.quizId, quizId));
  const nextOrder =
    existing.reduce((max, row) => Math.max(max, row.orderIndex), -1) + 1;

  const [created] = await db
    .insert(questions)
    .values({
      quizId,
      prompt: parsed.value.prompt,
      options: parsed.value.options,
      correctOptionId: parsed.value.correctOptionId,
      durationSeconds: parsed.value.durationSeconds,
      points: parsed.value.points,
      orderIndex: nextOrder,
    })
    .returning();

  await logAudit({
    eventId: ctx.event.id,
    userId: ctx.user.id,
    action: AUDIT_ACTIONS.questionCreated,
    details: { quizId, questionId: created.id },
  });
  revalidateSummit();
  return { ok: true, message: "Question added to the bank." };
}

export async function updateQuestionAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await adminContext();
  if (!ctx.ok) return { error: ctx.error };

  const quizId = String(formData.get("quizId") ?? "");
  const questionId = String(formData.get("questionId") ?? "");
  const quiz = await getQuizForEvent(quizId, ctx.event.id);
  if (!quiz) return { error: "That quiz could not be found." };
  if (await quizHasActiveSession(quizId)) {
    return { error: "Questions cannot change while a session is active." };
  }

  const [existing] = await db
    .select()
    .from(questions)
    .where(
      and(eq(questions.id, questionId), eq(questions.quizId, quizId)),
    )
    .limit(1);
  if (!existing) return { error: "That question could not be found." };

  const parsed = parseQuestionForm(formData);
  if (!parsed.ok) return { error: parsed.error };

  await db
    .update(questions)
    .set({
      prompt: parsed.value.prompt,
      options: parsed.value.options,
      correctOptionId: parsed.value.correctOptionId,
      durationSeconds: parsed.value.durationSeconds,
      points: parsed.value.points,
      updatedAt: new Date(),
    })
    .where(eq(questions.id, questionId));

  await logAudit({
    eventId: ctx.event.id,
    userId: ctx.user.id,
    action: AUDIT_ACTIONS.questionUpdated,
    details: { quizId, questionId },
  });
  revalidateSummit();
  return { ok: true, message: "Question saved." };
}

export async function deleteQuestionAction(formData: FormData) {
  const ctx = await adminContext();
  if (!ctx.ok) return;
  const quizId = String(formData.get("quizId") ?? "");
  const questionId = String(formData.get("questionId") ?? "");
  const quiz = await getQuizForEvent(quizId, ctx.event.id);
  if (!quiz || (await quizHasActiveSession(quizId))) return;

  await db
    .delete(questions)
    .where(and(eq(questions.id, questionId), eq(questions.quizId, quizId)));
  await logAudit({
    eventId: ctx.event.id,
    userId: ctx.user.id,
    action: AUDIT_ACTIONS.questionDeleted,
    details: { quizId, questionId },
  });
  revalidateSummit();
}

export async function moveQuestionAction(formData: FormData) {
  const ctx = await adminContext();
  if (!ctx.ok) return;
  const quizId = String(formData.get("quizId") ?? "");
  const questionId = String(formData.get("questionId") ?? "");
  const direction = String(formData.get("direction") ?? "");
  if (direction !== "up" && direction !== "down") return;
  const quiz = await getQuizForEvent(quizId, ctx.event.id);
  if (!quiz || (await quizHasActiveSession(quizId))) return;

  const list = await db
    .select()
    .from(questions)
    .where(eq(questions.quizId, quizId))
    .orderBy(asc(questions.orderIndex), asc(questions.createdAt));

  const index = list.findIndex((question) => question.id === questionId);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= list.length) return;

  const reordered = [...list];
  [reordered[index], reordered[target]] = [
    reordered[target],
    reordered[index],
  ];

  await db.transaction(async (tx) => {
    for (let position = 0; position < reordered.length; position += 1) {
      await tx
        .update(questions)
        .set({ orderIndex: position })
        .where(eq(questions.id, reordered[position].id));
    }
  });
  revalidateSummit();
}
