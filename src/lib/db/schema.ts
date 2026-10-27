import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import type {
  AnimationPreset,
  LiveMode,
  LogoLayout,
  LogoVisibility,
  QuizOption,
  PublicScene,
  QuizSettings,
  QuizStatus,
  Role,
  SceneContent,
  SceneLogoOverride,
  SceneType,
  ScoreboardDisplayMode,
  ThemeId,
} from "../types";
import {
  DEFAULT_LOGO_VISIBILITY,
  DEFAULT_QUIZ_SETTINGS,
} from "../constants";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role").$type<Role>().notNull().default("controller"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex("users_email_unique").on(sql`lower(${table.email})`)],
);

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  eventDate: date("event_date"),
  venue: text("venue"),
  description: text("description"),
  openingMessage: text("opening_message"),
  closingMessage: text("closing_message"),
  theme: text("theme").$type<ThemeId>().notNull().default("navy-gold"),
  animationStyle: text("animation_style")
    .$type<AnimationPreset>()
    .notNull()
    .default("fade"),
  logoLayout: text("logo_layout")
    .$type<LogoLayout>()
    .notNull()
    .default("primary"),
  logoVisibility: jsonb("logo_visibility")
    .$type<LogoVisibility>()
    .notNull()
    .default(DEFAULT_LOGO_VISIBILITY),
  status: text("status").notNull().default("draft"),
  isActive: boolean("is_active").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const files = pgTable(
  "files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    filename: text("filename").notNull(),
    mime: text("mime").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    sha256: text("sha256").notNull(),
    data: text("data").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("files_event_idx").on(table.eventId),
    index("files_sha_idx").on(table.eventId, table.sha256),
  ],
);

export const eventLogos = pgTable(
  "event_logos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    fileId: uuid("file_id")
      .notNull()
      .references(() => files.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    displayOrder: integer("display_order").notNull().default(0),
    isPrimary: boolean("is_primary").notNull().default(false),
    enabled: boolean("enabled").notNull().default(true),
    visibility: jsonb("visibility").$type<LogoVisibility | null>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("event_logos_event_idx").on(table.eventId),
    uniqueIndex("event_logos_one_primary")
      .on(table.eventId)
      .where(sql`${table.isPrimary}`),
  ],
);

export const speakers = pgTable(
  "speakers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    fullName: text("full_name").notNull(),
    title: text("title"),
    institution: text("institution"),
    topic: text("topic"),
    citation: text("citation"),
    photoFileId: uuid("photo_file_id").references(() => files.id, {
      onDelete: "set null",
    }),
    backgroundFileId: uuid("background_file_id").references(() => files.id, {
      onDelete: "set null",
    }),
    durationSeconds: integer("duration_seconds").notNull().default(120),
    animation: text("animation")
      .$type<AnimationPreset>()
      .notNull()
      .default("fade"),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("speakers_event_idx").on(table.eventId)],
);

export const scenes = pgTable(
  "scenes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    type: text("type").$type<SceneType>().notNull(),
    title: text("title").notNull(),
    content: jsonb("content").$type<SceneContent>().notNull().default({}),
    speakerId: uuid("speaker_id").references(() => speakers.id, {
      onDelete: "set null",
    }),
    backgroundFileId: uuid("background_file_id").references(() => files.id, {
      onDelete: "set null",
    }),
    animation: text("animation")
      .$type<AnimationPreset>()
      .notNull()
      .default("fade"),
    durationSeconds: integer("duration_seconds"),
    logoVisibility: jsonb("logo_visibility").$type<SceneLogoOverride | null>(),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("scenes_event_idx").on(table.eventId)],
);

export const sceneQueue = pgTable(
  "scene_queue",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    sceneId: uuid("scene_id")
      .notNull()
      .references(() => scenes.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("scene_queue_event_idx").on(table.eventId, table.position),
    uniqueIndex("scene_queue_scene_unique").on(table.eventId, table.sceneId),
  ],
);

export const fixtures = pgTable(
  "fixtures",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    stage: text("stage").notNull().default("Group stage"),
    teamA: text("team_a").notNull(),
    teamB: text("team_b").notNull(),
    scoreA: integer("score_a"),
    scoreB: integer("score_b"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    venue: text("venue"),
    status: text("status").$type<"scheduled" | "live" | "completed">().notNull().default("scheduled"),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("fixtures_event_idx").on(table.eventId, table.displayOrder)],
);

export const scoreboards = pgTable(
  "scoreboards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    mode: text("mode").$type<"individual" | "team">().notNull().default("team"),
    displayMode: text("display_mode")
      .$type<ScoreboardDisplayMode>()
      .notNull()
      .default("sequential"),
    tieBreaker: text("tie_breaker").notNull().default("name"),
    animation: text("animation")
      .$type<AnimationPreset>()
      .notNull()
      .default("reveal"),
    logoVisibility: jsonb("logo_visibility").$type<LogoVisibility | null>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex("scoreboards_event_unique").on(table.eventId)],
);

export const teams = pgTable(
  "teams",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scoreboardId: uuid("scoreboard_id")
      .notNull()
      .references(() => scoreboards.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    score: integer("score").notNull().default(0),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("teams_scoreboard_idx").on(table.scoreboardId)],
);

export const quizzes = pgTable(
  "quizzes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    settings: jsonb("settings")
      .$type<QuizSettings>()
      .notNull()
      .default(DEFAULT_QUIZ_SETTINGS),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("quizzes_event_idx").on(table.eventId)],
);

export const questions = pgTable(
  "questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quizId: uuid("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    prompt: text("prompt").notNull(),
    options: jsonb("options").$type<QuizOption[]>().notNull().default([]),
    correctOptionId: text("correct_option_id").notNull(),
    durationSeconds: integer("duration_seconds").notNull().default(20),
    points: integer("points").notNull().default(1000),
    orderIndex: integer("order_index").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("questions_quiz_idx").on(table.quizId, table.orderIndex)],
);

export const quizSessions = pgTable(
  "quiz_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    quizId: uuid("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    pin: text("pin").notNull(),
    status: text("status").$type<QuizStatus>().notNull().default("lobby"),
    lobbyOpen: boolean("lobby_open").notNull().default(true),
    lobbyEndsAt: timestamp("lobby_ends_at", { withTimezone: true }),
    currentQuestionIndex: integer("current_question_index").notNull().default(0),
    currentQuestionId: uuid("current_question_id").references(
      () => questions.id,
      { onDelete: "set null" },
    ),
    questionOrder: jsonb("question_order")
      .$type<string[]>()
      .notNull()
      .default([]),
    optionOrders: jsonb("option_orders")
      .$type<Record<string, string[]>>()
      .notNull()
      .default({}),
    questionStartedAt: timestamp("question_started_at", {
      withTimezone: true,
    }),
    questionEndsAt: timestamp("question_ends_at", { withTimezone: true }),
    remainingMs: integer("remaining_ms"),
    submissionCount: integer("submission_count").notNull().default(0),
    startedAt: timestamp("started_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("quiz_sessions_pin_unique").on(table.pin),
    index("quiz_sessions_event_idx").on(table.eventId, table.status),
  ],
);

export const participants = pgTable(
  "participants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => quizSessions.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    score: integer("score").notNull().default(0),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("participants_session_idx").on(table.sessionId),
    uniqueIndex("participants_session_name_unique").on(
      table.sessionId,
      sql`lower(${table.name})`,
    ),
  ],
);

export const responses = pgTable(
  "responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => quizSessions.id, { onDelete: "cascade" }),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    optionId: text("option_id").notNull(),
    isCorrect: boolean("is_correct").notNull().default(false),
    points: integer("points").notNull().default(0),
    responseMs: integer("response_ms").notNull().default(0),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("responses_participant_question_unique").on(
      table.participantId,
      table.questionId,
    ),
    index("responses_session_idx").on(table.sessionId),
    index("responses_question_idx").on(table.questionId),
  ],
);

export const liveState = pgTable("live_state", {
  eventId: uuid("event_id")
    .primaryKey()
    .references(() => events.id, { onDelete: "cascade" }),
  mode: text("mode").$type<LiveMode>().notNull().default("holding"),
  sceneId: uuid("scene_id").references(() => scenes.id, {
    onDelete: "set null",
  }),
  sceneSnapshot: jsonb("scene_snapshot").$type<PublicScene | null>(),
  countdownLabel: text("countdown_label")
    .notNull()
    .default("Session begins in"),
  countdownEndsAt: timestamp("countdown_ends_at", { withTimezone: true }),
  countdownRemainingMs: integer("countdown_remaining_ms"),
  countdownRunning: boolean("countdown_running").notNull().default(false),
  scoreboardRevealCount: integer("scoreboard_reveal_count")
    .notNull()
    .default(0),
  scoreboardShowAll: boolean("scoreboard_show_all").notNull().default(false),
  quizSessionId: uuid("quiz_session_id").references(() => quizSessions.id, {
    onDelete: "set null",
  }),
  revision: integer("revision").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id").references(() => events.id, {
      onDelete: "set null",
    }),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    details: jsonb("details").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("audit_logs_event_idx").on(table.eventId, table.createdAt)],
);

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  windowStart: timestamp("window_start", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type User = typeof users.$inferSelect;
export type Event = typeof events.$inferSelect;
export type FileRecord = typeof files.$inferSelect;
export type EventLogo = typeof eventLogos.$inferSelect;
export type Speaker = typeof speakers.$inferSelect;
export type Scene = typeof scenes.$inferSelect;
export type SceneQueueItem = typeof sceneQueue.$inferSelect;
export type Fixture = typeof fixtures.$inferSelect;
export type Scoreboard = typeof scoreboards.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type Quiz = typeof quizzes.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type QuizSession = typeof quizSessions.$inferSelect;
export type Participant = typeof participants.$inferSelect;
export type Response = typeof responses.$inferSelect;
export type LiveState = typeof liveState.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
