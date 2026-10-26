import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { liveState, type LiveState, type Participant } from "@/lib/db/schema";
import type {
  ControlQuizState,
  ControlStatePayload,
  PlayStatePayload,
  PublicLivePayload,
  PublicLiveState,
  PublicScoreboard,
} from "@/lib/types";
import {
  defaultLiveState,
  getActiveEvent,
  getEventById,
  getEventLogos,
  getEventQueue,
  getEventQuizzes,
  getEventScenes,
  getEventScoreboard,
  getEventSpeakers,
  toPublicEvent,
  toPublicSpeaker,
} from "./events";
import {
  buildPublicQuizState,
  currentQuestionForSession,
  getLeaderboard,
  getOptionStats,
  getParticipantCount,
  getParticipantFromToken,
  getParticipantList,
  getParticipantResponse,
  getQuizBundle,
  getSessionById,
  orderedQuestionIds,
  quizSettings,
  revealIsVisible,
  type QuizBundle,
} from "./quiz";
import type { QuizSession } from "@/lib/db/schema";

export function toPublicLiveState(live: LiveState): PublicLiveState {
  return {
    mode: live.mode,
    sceneId: live.sceneId,
    countdownLabel: live.countdownLabel,
    countdownEndsAt: live.countdownEndsAt?.toISOString() ?? null,
    countdownRemainingMs: live.countdownRemainingMs,
    countdownRunning: live.countdownRunning,
    scoreboardRevealCount: live.scoreboardRevealCount,
    scoreboardShowAll: live.scoreboardShowAll,
    revision: live.revision,
    updatedAt: live.updatedAt.toISOString(),
  };
}

export async function getLiveState(eventId: string) {
  const [row] = await db
    .select()
    .from(liveState)
    .where(eq(liveState.eventId, eventId))
    .limit(1);
  return row ?? null;
}

function sliceScoreboard(
  scoreboard: PublicScoreboard | null,
  live: LiveState,
): PublicScoreboard | null {
  if (!scoreboard) return null;
  const revealed = live.scoreboardShowAll
    ? scoreboard.entries.length
    : Math.min(live.scoreboardRevealCount, scoreboard.entries.length);
  return {
    ...scoreboard,
    entries: scoreboard.entries.slice(0, revealed),
    revealedCount: revealed,
    totalEntries: scoreboard.entries.length,
  };
}

export async function buildPublicLivePayload(
  eventId?: string,
): Promise<PublicLivePayload> {
  const event = eventId ? await getEventById(eventId) : await getActiveEvent();
  if (!event) {
    return {
      event: null,
      logos: [],
      live: null,
      scene: null,
      scoreboard: null,
      quiz: null,
      serverTime: new Date().toISOString(),
    };
  }

  const [logos, liveRow, scenes, scoreboard] = await Promise.all([
    getEventLogos(event.id),
    getLiveState(event.id),
    getEventScenes(event.id),
    getEventScoreboard(event.id),
  ]);

  const live = liveRow ?? defaultLiveState(event.id);
  const scene =
    live.sceneSnapshot ??
    (live.sceneId
      ? (scenes.find((item) => item.id === live.sceneId) ?? null)
      : null);

  let quiz = null;
  if (live.mode === "quiz" && live.quizSessionId) {
    const session = await getSessionById(live.quizSessionId);
    if (session && session.eventId === event.id) {
      const bundle = await getQuizBundle(session.quizId);
      if (bundle) quiz = await buildPublicQuizState(session, bundle);
    }
  }

  return {
    event: toPublicEvent(event),
    logos,
    live: toPublicLiveState(live),
    scene,
    scoreboard: sliceScoreboard(scoreboard, live),
    quiz,
    serverTime: new Date().toISOString(),
  };
}

export async function buildControlQuizState(
  session: QuizSession,
  bundle: QuizBundle,
): Promise<ControlQuizState> {
  const settings = quizSettings(bundle.quiz);
  const publicState = await buildPublicQuizState(session, bundle);
  const question = currentQuestionForSession(session, bundle.questions);
  const [stats, leaderboard, participants] = await Promise.all([
    question ? getOptionStats(session.id, question) : Promise.resolve(null),
    getLeaderboard(session.id, settings),
    getParticipantList(session.id),
  ]);

  const remainingMs =
    session.status === "question" && session.questionEndsAt
      ? Math.max(0, session.questionEndsAt.getTime() - Date.now())
      : session.remainingMs;

  const order = orderedQuestionIds(session, bundle.questions);
  const nextQuestion = bundle.questions.find(
    (item) => item.id === order[session.currentQuestionIndex + 1],
  );

  return {
    ...publicState,
    quizId: bundle.quiz.id,
    currentQuestionIndex: session.currentQuestionIndex,
    totalQuestions: order.length,
    remainingMs,
    leaderboard,
    participants,
    nextQuestionPrompt: nextQuestion?.prompt ?? null,
    question: publicState.question
      ? {
          ...publicState.question,
          correctOptionId: question?.correctOptionId ?? null,
        }
      : null,
    optionStats: stats,
  };
}

export async function buildControlPayload(): Promise<ControlStatePayload> {
  const event = await getActiveEvent();
  if (!event) {
    return {
      event: null,
      logos: [],
      live: null,
      scene: null,
      previewScenes: [],
      queue: [],
      speakers: [],
      scoreboard: null,
      quizzes: [],
      quiz: null,
      serverTime: new Date().toISOString(),
    };
  }

  const [logos, liveRow, scenes, queue, speakers, scoreboard, quizzes] =
    await Promise.all([
      getEventLogos(event.id),
      getLiveState(event.id),
      getEventScenes(event.id),
      getEventQueue(event.id),
      getEventSpeakers(event.id),
      getEventScoreboard(event.id),
      getEventQuizzes(event.id),
    ]);

  const live = liveRow ?? defaultLiveState(event.id);
  const scene =
    live.sceneSnapshot ??
    (live.sceneId
      ? (scenes.find((item) => item.id === live.sceneId) ?? null)
      : null);

  let quiz: ControlQuizState | null = null;
  if (live.quizSessionId) {
    const session = await getSessionById(live.quizSessionId);
    if (session && session.eventId === event.id) {
      const bundle = await getQuizBundle(session.quizId);
      if (bundle) quiz = await buildControlQuizState(session, bundle);
    }
  }

  return {
    event: toPublicEvent(event),
    logos,
    live: toPublicLiveState(live),
    scene,
    previewScenes: scenes,
    queue: queue
      .map((item) => {
        const queuedScene = scenes.find((entry) => entry.id === item.sceneId);
        return queuedScene
          ? { id: item.id, position: item.position, scene: queuedScene }
          : null;
      })
      .filter(
        (
          item,
        ): item is {
          id: string;
          position: number;
          scene: (typeof scenes)[number];
        } => item !== null,
      ),
    speakers: speakers.map(toPublicSpeaker),
    scoreboard,
    quizzes: quizzes.map((item) => ({
      ...item,
      questionCount: Number(item.questionCount),
    })),
    quiz,
    serverTime: new Date().toISOString(),
  };
}

export async function buildPlayState(
  participant: Participant,
): Promise<PlayStatePayload | null> {
  const session = await getSessionById(participant.sessionId);
  if (!session) return null;
  const event = await getEventById(session.eventId);
  if (!event) return null;
  const bundle = await getQuizBundle(session.quizId);
  if (!bundle) return null;

  const [logos, quiz, me, participantCount] = await Promise.all([
    getEventLogos(event.id),
    buildPublicQuizState(session, bundle),
    getParticipantFromToken(participant.id, session.id),
    getParticipantCount(session.id),
  ]);
  if (!me) return null;

  const question = currentQuestionForSession(session, bundle.questions);
  const response = question
    ? await getParticipantResponse(participant.id, question.id)
    : null;

  let rank: number | null = null;
  if (quiz.leaderboard) {
    rank =
      quiz.leaderboard.find((entry) => entry.participantId === me.id)?.rank ??
      null;
  }

  return {
    joined: true,
    event: toPublicEvent(event),
    logos,
    quiz,
    me: {
      id: me.id,
      name: me.name,
      score: me.score,
      rank,
      totalParticipants: participantCount,
      currentResponse: response
        ? {
            optionId: response.optionId,
            isCorrect: revealIsVisible(session.status)
              ? response.isCorrect
              : null,
            points: revealIsVisible(session.status) ? response.points : null,
          }
        : null,
    },
    serverTime: new Date().toISOString(),
  };
}
