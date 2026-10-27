import { and, asc, count, desc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  eventLogos,
  events,
  files,
  fixtures,
  imageSceneOverrides,
  questions,
  quizzes,
  sceneQueue,
  scenes,
  scoreboards,
  speakers,
  teams,
  type Event,
  type LiveState,
  type Scene,
  type Speaker,
} from "@/lib/db/schema";
import {
  DEFAULT_LOGO_VISIBILITY,
  isThemeId,
} from "@/lib/constants";
import { publicFileUrl } from "@/lib/files";
import type {
  PublicEvent,
  PublicFixture,
  PublicLogo,
  PublicScene,
  PublicScoreboard,
  PublicSpeaker,
} from "@/lib/types";

export async function getActiveEvent(): Promise<Event | null> {
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.isActive, true))
    .orderBy(desc(events.updatedAt))
    .limit(1);
  return event ?? null;
}

export async function getEventById(eventId: string): Promise<Event | null> {
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  return event ?? null;
}

export async function getEventByCode(eventCode: string): Promise<Event | null> {
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.eventCode, eventCode))
    .limit(1);
  return event ?? null;
}

export function generateEventCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function getAllEvents() {
  return db
    .select()
    .from(events)
    .orderBy(desc(events.isActive), desc(events.updatedAt));
}

export function toPublicEvent(event: Event): PublicEvent {
  return {
    id: event.id,
    title: event.title,
    subtitle: event.subtitle,
    eventDate: event.eventDate,
    venue: event.venue,
    description: event.description,
    openingMessage: event.openingMessage,
    closingMessage: event.closingMessage,
    eventCode: event.eventCode,
    theme: isThemeId(event.theme) ? event.theme : "navy-gold",
    animationStyle: event.animationStyle,
    logoLayout: event.logoLayout,
    logoVisibility: event.logoVisibility ?? DEFAULT_LOGO_VISIBILITY,
    status: event.status,
  };
}

export async function getEventLogos(
  eventId: string,
  includeDisabled = false,
): Promise<PublicLogo[]> {
  const rows = await db
    .select({
      id: eventLogos.id,
      name: eventLogos.name,
      displayOrder: eventLogos.displayOrder,
      isPrimary: eventLogos.isPrimary,
      enabled: eventLogos.enabled,
      fileId: eventLogos.fileId,
    })
    .from(eventLogos)
    .where(
      includeDisabled
        ? eq(eventLogos.eventId, eventId)
        : and(eq(eventLogos.eventId, eventId), eq(eventLogos.enabled, true)),
    )
    .orderBy(asc(eventLogos.displayOrder), asc(eventLogos.createdAt));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    url: publicFileUrl(row.fileId),
    isPrimary: row.isPrimary,
    displayOrder: row.displayOrder,
  }));
}

export async function getAdminLogos(eventId: string) {
  return db
    .select({
      id: eventLogos.id,
      name: eventLogos.name,
      displayOrder: eventLogos.displayOrder,
      isPrimary: eventLogos.isPrimary,
      enabled: eventLogos.enabled,
      fileId: eventLogos.fileId,
      createdAt: eventLogos.createdAt,
    })
    .from(eventLogos)
    .where(eq(eventLogos.eventId, eventId))
    .orderBy(asc(eventLogos.displayOrder), asc(eventLogos.createdAt));
}

export async function getRequiredLogos(eventId: string) {
  return db
    .select({
      id: eventLogos.id,
      name: eventLogos.name,
      displayOrder: eventLogos.displayOrder,
      isPrimary: eventLogos.isPrimary,
    })
    .from(eventLogos)
    .where(and(eq(eventLogos.eventId, eventId), eq(eventLogos.enabled, true)))
    .orderBy(asc(eventLogos.displayOrder));
}

export function toPublicSpeaker(speaker: Speaker): PublicSpeaker {
  return {
    id: speaker.id,
    fullName: speaker.fullName,
    title: speaker.title,
    institution: speaker.institution,
    topic: speaker.topic,
    citation: speaker.citation,
    photoUrl: speaker.photoFileId ? publicFileUrl(speaker.photoFileId) : null,
    backgroundUrl: speaker.backgroundFileId
      ? publicFileUrl(speaker.backgroundFileId)
      : null,
    animation: speaker.animation,
    durationSeconds: speaker.durationSeconds,
  };
}

export async function getEventSpeakers(eventId: string) {
  return db
    .select()
    .from(speakers)
    .where(eq(speakers.eventId, eventId))
    .orderBy(asc(speakers.displayOrder), asc(speakers.createdAt));
}

export function toPublicFixture(fixture: {
  id: string;
  stage: string;
  teamA: string;
  teamB: string;
  scoreA: number | null;
  scoreB: number | null;
  scheduledAt: Date | null;
  venue: string | null;
  status: "scheduled" | "live" | "completed";
}): PublicFixture {
  return {
    id: fixture.id,
    stage: fixture.stage,
    teamA: fixture.teamA,
    teamB: fixture.teamB,
    scoreA: fixture.scoreA,
    scoreB: fixture.scoreB,
    scheduledAt: fixture.scheduledAt
      ? fixture.scheduledAt.toISOString()
      : null,
    venue: fixture.venue,
    status: fixture.status,
  };
}

export async function getEventFixtures(
  eventId: string,
): Promise<PublicFixture[]> {
  const rows = await db
    .select()
    .from(fixtures)
    .where(eq(fixtures.eventId, eventId))
    .orderBy(asc(fixtures.displayOrder), asc(fixtures.createdAt));
  return rows.map(toPublicFixture);
}

export function toPublicScene(
  scene: Scene,
  speaker: Speaker | null,
  extras: {
    backgroundFileId?: string | null;
    backgroundUrl?: string | null;
    fixtures?: PublicFixture[] | null;
  } = {},
): PublicScene {
  return {
    id: scene.id,
    type: scene.type,
    title: scene.title,
    content: scene.content ?? {},
    animation: scene.animation,
    durationSeconds: scene.durationSeconds,
    logoVisibility: scene.logoVisibility,
    backgroundFileId: extras.backgroundFileId ?? null,
    backgroundUrl: extras.backgroundUrl ?? null,
    speaker: speaker ? toPublicSpeaker(speaker) : null,
    fixtures: scene.type === "fixtures" ? (extras.fixtures ?? []) : null,
  };
}

export async function getPublicSceneById(
  eventId: string,
  sceneId: string,
): Promise<PublicScene | null> {
  const [row] = await db
    .select({ scene: scenes, speaker: speakers, backgroundId: files.id })
    .from(scenes)
    .leftJoin(speakers, eq(scenes.speakerId, speakers.id))
    .leftJoin(files, eq(scenes.backgroundFileId, files.id))
    .where(and(eq(scenes.id, sceneId), eq(scenes.eventId, eventId)))
    .limit(1);
  if (!row) return null;
  const fixturesForScene =
    row.scene.type === "fixtures"
      ? await getEventFixtures(eventId)
      : undefined;
  return toPublicScene(row.scene, row.speaker, {
    backgroundFileId: row.scene.backgroundFileId,
    backgroundUrl: row.backgroundId ? publicFileUrl(row.backgroundId) : null,
    fixtures: fixturesForScene,
  });
}

export async function getEventScenes(eventId: string) {
  const rows = await db
    .select({ scene: scenes, speaker: speakers, backgroundId: files.id })
    .from(scenes)
    .leftJoin(speakers, eq(scenes.speakerId, speakers.id))
    .leftJoin(files, eq(scenes.backgroundFileId, files.id))
    .where(eq(scenes.eventId, eventId))
    .orderBy(asc(scenes.displayOrder), asc(scenes.createdAt));

  const needsFixtures = rows.some((row) => row.scene.type === "fixtures");
  const fixtureRows = needsFixtures ? await getEventFixtures(eventId) : [];

  const imageOverridesMap = new Map<string, { speakerName: string | null; topic: string | null; stance: string | null }>();
  const imageOverrideRows = await db
    .select()
    .from(imageSceneOverrides)
    .where(
      sql`scene_id = ANY(${rows.map(r => r.scene.id)})`,
    )
    .execute();
  
  for (const override of imageOverrideRows) {
    imageOverridesMap.set(override.sceneId, {
      speakerName: override.speakerName,
      topic: override.topic,
      stance: override.stance,
    });
  }

  return rows.map((row) => {
    const overrides = imageOverridesMap.get(row.scene.id) ?? null;
    return toPublicScene(row.scene, row.speaker, {
      backgroundFileId: row.scene.backgroundFileId,
      backgroundUrl: row.backgroundId ? publicFileUrl(row.backgroundId) : null,
      fixtures: fixtureRows,
      imageOverrides: overrides,
    });
  });
}

export async function getEventQueue(eventId: string) {
  const rows = await db
    .select({ id: sceneQueue.id, sceneId: sceneQueue.sceneId, position: sceneQueue.position })
    .from(sceneQueue)
    .where(eq(sceneQueue.eventId, eventId))
    .orderBy(asc(sceneQueue.position), asc(sceneQueue.createdAt));
  return rows;
}

export async function getEventScoreboard(
  eventId: string,
): Promise<PublicScoreboard | null> {
  const [board] = await db
    .select()
    .from(scoreboards)
    .where(eq(scoreboards.eventId, eventId))
    .limit(1);
  if (!board) return null;

  const entries = await db
    .select()
    .from(teams)
    .where(eq(teams.scoreboardId, board.id))
    .orderBy(desc(teams.score), asc(teams.displayOrder), asc(teams.name));

  return {
    id: board.id,
    title: board.title,
    description: board.description,
    mode: board.mode,
    displayMode: board.displayMode,
    tieBreaker: board.tieBreaker,
    animation: board.animation,
    entries: entries.map((entry) => ({
      id: entry.id,
      name: entry.name,
      score: entry.score,
      displayOrder: entry.displayOrder,
    })),
    totalEntries: entries.length,
    revealedCount: 0,
  };
}

export async function getEventQuizzes(eventId: string) {
  const rows = await db
    .select({
      id: quizzes.id,
      title: quizzes.title,
      settings: quizzes.settings,
      questionCount: count(questions.id),
    })
    .from(quizzes)
    .leftJoin(questions, eq(questions.quizId, quizzes.id))
    .where(eq(quizzes.eventId, eventId))
    .groupBy(quizzes.id)
    .orderBy(asc(quizzes.createdAt));

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    settings: row.settings,
    questionCount: row.questionCount,
  }));
}

export function defaultLiveState(eventId: string): LiveState {
  return {
    eventId,
    mode: "holding",
    sceneId: null,
    sceneSnapshot: null,
    countdownLabel: "Session begins in",
    countdownEndsAt: null,
    countdownRemainingMs: null,
    countdownRunning: false,
    scoreboardRevealCount: 0,
    scoreboardShowAll: false,
    quizSessionId: null,
    revision: 0,
    updatedAt: new Date(),
  };
}
