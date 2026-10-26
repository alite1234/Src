import { and, asc, count, desc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  participants,
  questions,
  quizzes,
  quizSessions,
  responses,
  type Participant,
  type Question,
  type Quiz,
  type QuizSession,
} from "@/lib/db/schema";
import { DEFAULT_QUIZ_SETTINGS } from "@/lib/constants";
import type {
  LeaderboardEntry,
  PublicQuizQuestion,
  PublicQuizState,
  QuizOption,
  QuizOptionStat,
  QuizSettings,
} from "@/lib/types";

export type QuizBundle = {
  quiz: Quiz;
  questions: Question[];
};

export async function getQuizBundle(quizId: string) {
  const [quiz] = await db
    .select()
    .from(quizzes)
    .where(eq(quizzes.id, quizId))
    .limit(1);
  if (!quiz) return null;
  const questionRows = await db
    .select()
    .from(questions)
    .where(eq(questions.quizId, quizId))
    .orderBy(asc(questions.orderIndex));
  return { quiz, questions: questionRows } satisfies QuizBundle;
}

export async function getSessionById(sessionId: string) {
  const [session] = await db
    .select()
    .from(quizSessions)
    .where(eq(quizSessions.id, sessionId))
    .limit(1);
  return session ?? null;
}

export function quizSettings(quiz: Quiz): QuizSettings {
  return { ...DEFAULT_QUIZ_SETTINGS, ...(quiz.settings ?? {}) };
}

export function orderedQuestionIds(session: QuizSession, questions: Question[]) {
  const stored = session.questionOrder ?? [];
  const valid = stored.filter((id) => questions.some((q) => q.id === id));
  if (valid.length === questions.length) return valid;
  return questions.map((q) => q.id);
}

export function currentQuestionForSession(
  session: QuizSession,
  questions: Question[],
) {
  if (session.currentQuestionId) {
    const found = questions.find((q) => q.id === session.currentQuestionId);
    if (found) return found;
  }
  const order = orderedQuestionIds(session, questions);
  const id = order[session.currentQuestionIndex];
  return questions.find((q) => q.id === id) ?? null;
}

export function orderedOptions(
  session: QuizSession,
  question: Question,
): QuizOption[] {
  const base = Array.isArray(question.options) ? question.options : [];
  const stored = session.optionOrders?.[question.id];
  if (!stored || stored.length !== base.length) return base;
  const mapped = stored
    .map((id) => base.find((option) => option.id === id))
    .filter((option): option is QuizOption => Boolean(option));
  return mapped.length === base.length ? mapped : base;
}

export function revealIsVisible(status: QuizSession["status"]) {
  return status === "reveal" || status === "leaderboard" || status === "ended";
}

export async function getParticipantCount(sessionId: string) {
  const [row] = await db
    .select({ value: count(participants.id) })
    .from(participants)
    .where(eq(participants.sessionId, sessionId));
  return row?.value ?? 0;
}

export async function getParticipantList(sessionId: string) {
  return db
    .select({
      id: participants.id,
      name: participants.name,
      score: participants.score,
    })
    .from(participants)
    .where(eq(participants.sessionId, sessionId))
    .orderBy(asc(participants.joinedAt), asc(participants.name));
}

export async function getLeaderboard(
  sessionId: string,
  settings: QuizSettings,
  limit?: number,
): Promise<LeaderboardEntry[]> {
  const totalTime = sql<number>`coalesce(sum(${responses.responseMs}), 0)`;
  const base = db
    .select({
      participantId: participants.id,
      name: participants.name,
      score: participants.score,
      joinedAt: participants.joinedAt,
      totalMs: totalTime.mapWith(Number),
    })
    .from(participants)
    .leftJoin(responses, eq(responses.participantId, participants.id))
    .where(eq(participants.sessionId, sessionId))
    .groupBy(participants.id);

  const ordered =
    settings.tieBreaker === "name"
      ? base.orderBy(
          desc(participants.score),
          asc(participants.name),
          asc(participants.joinedAt),
        )
      : base.orderBy(
          desc(participants.score),
          asc(totalTime),
          asc(participants.joinedAt),
        );

  const rows = limit ? await ordered.limit(limit) : await ordered;

  return rows.map((row, index) => ({
    participantId: row.participantId,
    name: row.name,
    score: row.score,
    rank: index + 1,
    totalMs: row.totalMs ?? 0,
  }));
}

export async function getParticipantRank(
  sessionId: string,
  participantId: string,
  settings: QuizSettings,
) {
  const leaderboard = await getLeaderboard(sessionId, settings);
  const index = leaderboard.findIndex(
    (entry) => entry.participantId === participantId,
  );
  return {
    rank: index >= 0 ? index + 1 : null,
    total: leaderboard.length,
    leaderboard,
  };
}

export async function getOptionStats(
  sessionId: string,
  question: Question,
): Promise<QuizOptionStat[]> {
  const rows = await db
    .select({
      optionId: responses.optionId,
      value: count(responses.id),
    })
    .from(responses)
    .where(
      and(
        eq(responses.sessionId, sessionId),
        eq(responses.questionId, question.id),
      ),
    )
    .groupBy(responses.optionId);

  const base = Array.isArray(question.options) ? question.options : [];
  return base.map((option: QuizOption) => ({
    optionId: option.id,
    count: rows.find((row) => row.optionId === option.id)?.value ?? 0,
    isCorrect: option.id === question.correctOptionId,
  }));
}

export async function getParticipantResponse(
  participantId: string,
  questionId: string,
) {
  const [row] = await db
    .select()
    .from(responses)
    .where(
      and(
        eq(responses.participantId, participantId),
        eq(responses.questionId, questionId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getParticipantFromToken(
  participantId: string,
  sessionId: string,
): Promise<Participant | null> {
  const [row] = await db
    .select()
    .from(participants)
    .where(
      and(
        eq(participants.id, participantId),
        eq(participants.sessionId, sessionId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function buildPublicQuizState(
  session: QuizSession,
  bundle: QuizBundle,
): Promise<PublicQuizState> {
  const settings = quizSettings(bundle.quiz);
  const question = currentQuestionForSession(session, bundle.questions);
  const questionCount = orderedQuestionIds(session, bundle.questions).length;
  const reveal = revealIsVisible(session.status);
  const participantCount = await getParticipantCount(session.id);

  let stats: QuizOptionStat[] | null = null;
  let leaderboard: LeaderboardEntry[] | null = null;

  if (question && reveal) {
    stats = await getOptionStats(session.id, question);
  }

  if (session.status === "leaderboard" || session.status === "ended") {
    leaderboard = await getLeaderboard(session.id, settings);
  }

  const publicQuestion: PublicQuizQuestion | null = question
    ? {
        id: question.id,
        prompt: question.prompt,
        options: orderedOptions(session, question),
        durationSeconds: question.durationSeconds,
        index: session.currentQuestionIndex + 1,
        total: questionCount,
        startedAt: session.questionStartedAt?.toISOString() ?? null,
        endsAt: session.questionEndsAt?.toISOString() ?? null,
        pausedRemainingMs: session.remainingMs,
        status: session.status,
        correctOptionId: reveal ? question.correctOptionId : null,
      }
    : null;

  return {
    sessionId: session.id,
    quizTitle: bundle.quiz.title,
    pin: session.pin,
    status: session.status,
    lobbyOpen: session.lobbyOpen,
    lobbyEndsAt: session.lobbyEndsAt?.toISOString() ?? null,
    participantCount,
    submissionCount: session.submissionCount,
    question: publicQuestion,
    optionStats: stats,
    leaderboard,
    showLeaderboard: settings.showLeaderboard,
  };
}
