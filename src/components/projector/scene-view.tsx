"use client";

import { AnimatePresence } from "framer-motion";

import type {
  PublicEvent,
  PublicFixture,
  PublicLogo,
  PublicScene,
  PublicScoreboard,
  PublicSpeaker,
} from "@/lib/types";
import { logosVisibleFor } from "@/lib/logo-visibility";
import {
  formatEventDate,
  formatFixtureKickoff,
  initials,
} from "@/lib/utils";
import { Stage } from "./stage";
import { LeaderboardView } from "./leaderboard-view";
import { SceneMotion } from "./scene-motion";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[1.15cqw] font-semibold uppercase tracking-[0.4em] text-[var(--stage-accent)]">
      {children}
    </p>
  );
}

function GoldRule({ className = "" }: { className?: string }) {
  return (
    <div
      className={`h-px bg-[linear-gradient(90deg,transparent,var(--stage-accent),transparent)] ${className}`}
    />
  );
}

function Portrait({
  speaker,
  className = "",
  rounded = "rounded-2xl",
}: {
  speaker: PublicSpeaker;
  className?: string;
  rounded?: string;
}) {
  if (speaker.photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={speaker.photoUrl}
        alt={speaker.fullName}
        className={`h-full w-full object-cover ${rounded} ${className}`}
      />
    );
  }
  return (
    <div
      className={`flex h-full w-full items-center justify-center bg-[var(--stage-surface)] ${rounded} ${className}`}
    >
      <span className="font-display text-[5cqw] text-[var(--stage-accent)]/80">
        {initials(speaker.fullName)}
      </span>
    </div>
  );
}

function SpeakerBackdrop({ speaker }: { speaker: PublicSpeaker | null }) {
  if (!speaker?.backgroundUrl) return null;
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.12]"
      style={{
        backgroundImage: `url(${speaker.backgroundUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    />
  );
}

function SceneBackdrop({ scene }: { scene: PublicScene }) {
  if (!scene.backgroundUrl) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={scene.backgroundUrl}
        alt=""
        className="h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(2,6,18,0.55)_0%,rgba(2,6,18,0.88)_100%)]" />
    </div>
  );
}

function OpeningScene({
  scene,
  event,
}: {
  scene: PublicScene;
  event: PublicEvent;
}) {
  const heading = scene.content.heading || event.title || scene.title;
  const subtitle = scene.content.subheading || event.subtitle;
  const detail = [formatEventDate(event.eventDate), event.venue]
    .filter(Boolean)
    .join("  ·  ");

  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <Eyebrow>{event.subtitle ?? "Legislative Summit"}</Eyebrow>
      <h1 className="mt-[2.4cqh] max-w-[84cqw] text-balance font-display text-[7.2cqw] leading-[1.02] tracking-tight">
        {heading}
      </h1>
      <GoldRule className="mt-[3cqh] w-[24cqw]" />
      {subtitle ? (
        <p className="mt-[2.4cqh] max-w-[62cqw] text-balance text-[1.8cqw] leading-relaxed text-[var(--stage-muted)]">
          {subtitle}
        </p>
      ) : null}
      {detail ? (
        <p className="mt-[3.2cqh] text-[1.35cqw] uppercase tracking-[0.3em] text-[var(--stage-accent-2)]">
          {detail}
        </p>
      ) : null}
      {scene.content.body ? (
        <p className="mt-[2.4cqh] max-w-[64cqw] text-balance text-[1.3cqw] leading-relaxed text-[var(--stage-muted)]">
          {scene.content.body}
        </p>
      ) : null}
    </div>
  );
}

function WelcomeScene({
  scene,
  event,
}: {
  scene: PublicScene;
  event: PublicEvent;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <Eyebrow>Welcome</Eyebrow>
      <h1 className="mt-[2.2cqh] max-w-[82cqw] text-balance font-display text-[5.2cqw] leading-[1.05]">
        {scene.content.heading || scene.title}
      </h1>
      <GoldRule className="mt-[2.8cqh] w-[20cqw]" />
      <p className="mt-[2.6cqh] max-w-[68cqw] whitespace-pre-line text-balance text-[1.65cqw] leading-[1.7] text-[var(--stage-muted)]">
        {scene.content.body || event.openingMessage || event.description || ""}
      </p>
      {scene.content.footer ? (
        <p className="mt-[3cqh] text-[1.15cqw] uppercase tracking-[0.3em] text-[var(--stage-accent)]">
          {scene.content.footer}
        </p>
      ) : null}
    </div>
  );
}

function SpeakerScene({
  scene,
  mode,
}: {
  scene: PublicScene;
  mode: "intro" | "speaking";
}) {
  const speaker = scene.speaker;
  if (!speaker) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <Eyebrow>
          {mode === "intro" ? "Speaker Introduction" : "Speaking Now"}
        </Eyebrow>
        <h1 className="mt-[2cqh] font-display text-[4.5cqw]">
          {scene.content.heading || scene.title}
        </h1>
        <p className="mt-[2cqh] max-w-[60cqw] text-[1.5cqw] text-[var(--stage-muted)]">
          {scene.content.body || "Speaker details will appear here."}
        </p>
      </div>
    );
  }

  if (mode === "speaking") {
    return (
      <div className="relative flex h-full items-center gap-[4cqw]">
        <SpeakerBackdrop speaker={speaker} />
        <div className="relative min-w-0 flex-1">
          <div className="flex items-center gap-[1cqw]">
            <span className="h-[0.9cqh] w-[0.9cqh] animate-pulse rounded-full bg-[var(--stage-accent)]" />
            <Eyebrow>Speaking Now</Eyebrow>
          </div>
          <h1 className="mt-[2cqh] font-display text-[6.2cqw] leading-[1.02]">
            {speaker.fullName}
          </h1>
          <GoldRule className="mt-[2.4cqh] w-[18cqw]" />
          {speaker.title ? (
            <p className="mt-[2.2cqh] text-[1.8cqw] text-[var(--stage-text)]/90">
              {speaker.title}
            </p>
          ) : null}
          {speaker.institution ? (
            <p className="mt-[0.8cqh] text-[1.35cqw] uppercase tracking-[0.2em] text-[var(--stage-muted)]">
              {speaker.institution}
            </p>
          ) : null}
          {speaker.topic ? (
            <p className="mt-[2.6cqh] max-w-[50cqw] text-balance font-display text-[2.4cqw] leading-snug text-[var(--stage-accent-2)]">
              “{speaker.topic}”
            </p>
          ) : null}
        </div>
        <div className="relative h-[46cqh] w-[30cqw] shrink-0 overflow-hidden rounded-2xl border border-[var(--stage-accent)]/40 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)]">
          <Portrait speaker={speaker} rounded="rounded-none" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full items-center gap-[4.5cqw]">
      <SpeakerBackdrop speaker={speaker} />
      <div className="relative h-[54cqh] w-[34cqw] shrink-0 overflow-hidden rounded-2xl border border-[var(--stage-accent)]/35 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.85)]">
        <Portrait speaker={speaker} rounded="rounded-none" />
        <div className="absolute inset-x-0 bottom-0 h-[30%] bg-gradient-to-t from-black/70 to-transparent" />
      </div>
      <div className="relative min-w-0 flex-1">
        <Eyebrow>Speaker Introduction</Eyebrow>
        <h1 className="mt-[1.8cqh] text-balance font-display text-[5.4cqw] leading-[1.03]">
          {speaker.fullName}
        </h1>
        <GoldRule className="mt-[2.2cqh] w-[16cqw]" />
        {speaker.title ? (
          <p className="mt-[2cqh] text-[1.75cqw] text-[var(--stage-text)]/90">
            {speaker.title}
          </p>
        ) : null}
        {speaker.institution ? (
          <p className="mt-[0.8cqh] text-[1.3cqw] uppercase tracking-[0.22em] text-[var(--stage-muted)]">
            {speaker.institution}
          </p>
        ) : null}
        {speaker.topic ? (
          <div className="mt-[2.8cqh] rounded-xl border border-white/10 bg-white/[0.035] px-[1.8cqw] py-[1.5cqh]">
            <p className="text-[0.95cqw] uppercase tracking-[0.28em] text-[var(--stage-accent)]">
              Presenting
            </p>
            <p className="mt-[0.7cqh] text-balance font-display text-[2.1cqw] leading-snug">
              {speaker.topic}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CitationScene({
  scene,
  event,
}: {
  scene: PublicScene;
  event: PublicEvent;
}) {
  const speaker = scene.speaker;
  const citation =
    speaker?.citation ||
    scene.content.body ||
    event.description ||
    "Citation text will appear here.";

  // Scale the type size to the citation length so long citations still fit.
  const citationLength = citation.length;
  const citationSize =
    citationLength > 1400
      ? "1.02cqw"
      : citationLength > 1000
        ? "1.16cqw"
        : citationLength > 650
          ? "1.3cqw"
          : "1.46cqw";

  return (
    <div className="relative flex h-full items-center gap-[4cqw]">
      <SpeakerBackdrop speaker={speaker} />
      <div className="relative w-[30cqw] shrink-0 text-center">
        <div className="mx-auto h-[46cqh] w-[26cqw] overflow-hidden rounded-2xl border border-[var(--stage-accent)]/35">
          {speaker ? (
            <Portrait speaker={speaker} rounded="rounded-none" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[var(--stage-surface)]">
              <span className="font-display text-[4cqw] text-[var(--stage-accent)]/60">
                SRC
              </span>
            </div>
          )}
        </div>
        <p className="mt-[2cqh] font-display text-[2.6cqw] leading-tight">
          {speaker?.fullName ?? scene.title}
        </p>
        {speaker?.title ? (
          <p className="mt-[0.6cqh] text-[1.1cqw] uppercase tracking-[0.16em] text-[var(--stage-accent)]">
            {speaker.title}
          </p>
        ) : null}
        {speaker?.institution ? (
          <p className="mt-[0.4cqh] text-[1.05cqw] text-[var(--stage-muted)]">
            {speaker.institution}
          </p>
        ) : null}
      </div>

      <div className="relative flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-[1.2cqw]">
          <span className="font-display text-[5.5cqw] leading-none text-[var(--stage-accent)]/60">
            “
          </span>
          <Eyebrow>Citation</Eyebrow>
        </div>
        <div className="mt-[1.2cqh] max-h-[68cqh] overflow-y-auto pr-[1cqw]">
          <p
            className="whitespace-pre-line leading-[1.72] text-[var(--stage-text)]/92"
            style={{ fontSize: `clamp(14px, ${citationSize}, 30px)` }}
          >
            {citation}
          </p>
        </div>
        <GoldRule className="mt-[2.2cqh] w-full" />
      </div>
    </div>
  );
}

function TopicScene({
  scene,
  event,
}: {
  scene: PublicScene;
  event: PublicEvent;
}) {
  return (
    <div className="flex h-full flex-col justify-center">
      <Eyebrow>Session Topic</Eyebrow>
      <h1 className="mt-[2.4cqh] max-w-[82cqw] text-balance font-display text-[6cqw] leading-[1.04]">
        {scene.content.heading || scene.title}
      </h1>
      {scene.content.subheading ? (
        <p className="mt-[2cqh] max-w-[66cqw] text-[1.8cqw] leading-relaxed text-[var(--stage-accent-2)]">
          {scene.content.subheading}
        </p>
      ) : null}
      <GoldRule className="mt-[3cqh] w-[22cqw]" />
      {scene.content.body ? (
        <p className="mt-[2.6cqh] max-w-[68cqw] whitespace-pre-line text-[1.45cqw] leading-[1.7] text-[var(--stage-muted)]">
          {scene.content.body}
        </p>
      ) : null}
      <p className="mt-[3.2cqh] text-[1.05cqw] uppercase tracking-[0.28em] text-[var(--stage-muted)]">
        {event.title}
      </p>
    </div>
  );
}

function AnnouncementScene({ scene }: { scene: PublicScene }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <Eyebrow>Announcement</Eyebrow>
      <h1 className="mt-[2.2cqh] max-w-[82cqw] text-balance font-display text-[5.2cqw] leading-[1.06]">
        {scene.content.heading || scene.title}
      </h1>
      <GoldRule className="mt-[2.8cqh] w-[18cqw]" />
      {scene.content.body ? (
        <p className="mt-[2.6cqh] max-w-[66cqw] whitespace-pre-line text-balance text-[1.6cqw] leading-[1.7] text-[var(--stage-muted)]">
          {scene.content.body}
        </p>
      ) : null}
      {scene.content.footer ? (
        <p className="mt-[2.8cqh] text-[1.1cqw] uppercase tracking-[0.3em] text-[var(--stage-accent)]">
          {scene.content.footer}
        </p>
      ) : null}
    </div>
  );
}

function BreakScene({
  scene,
  event,
}: {
  scene: PublicScene;
  event: PublicEvent;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <Eyebrow>Intermission</Eyebrow>
      <h1 className="mt-[2.2cqh] font-display text-[7cqw] leading-none">
        {scene.content.heading || "Short Break"}
      </h1>
      <GoldRule className="mt-[3cqh] w-[22cqw]" />
      <p className="mt-[2.6cqh] max-w-[58cqw] text-balance text-[1.5cqw] leading-relaxed text-[var(--stage-muted)]">
        {scene.content.body || "Please remain seated. We will resume shortly."}
      </p>
      <p className="mt-[3.4cqh] text-[1.05cqw] uppercase tracking-[0.32em] text-[var(--stage-accent-2)]">
        {event.title}
      </p>
    </div>
  );
}

function ClosingScene({
  scene,
  event,
}: {
  scene: PublicScene;
  event: PublicEvent;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <Eyebrow>Closing</Eyebrow>
      <h1 className="mt-[1.8cqh] font-display text-[8cqw] leading-none">
        {scene.content.heading || "Thank You"}
      </h1>
      <GoldRule className="mt-[3cqh] w-[24cqw]" />
      <p className="mt-[2.8cqh] max-w-[64cqw] whitespace-pre-line text-balance text-[1.55cqw] leading-[1.7] text-[var(--stage-muted)]">
        {scene.content.body ||
          event.closingMessage ||
          "Thank you for joining the SRC Legislative Summit."}
      </p>
      <p className="mt-[4cqh] font-display text-[2cqw] text-[var(--stage-accent-2)]">
        {event.title}
      </p>
      <p className="mt-[0.8cqh] text-[1.05cqw] uppercase tracking-[0.28em] text-[var(--stage-muted)]">
        {[formatEventDate(event.eventDate), event.venue]
          .filter(Boolean)
          .join(" · ")}
      </p>
    </div>
  );
}

function QuizIntroScene({ scene }: { scene: PublicScene }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <Eyebrow>Live Quiz</Eyebrow>
      <h1 className="mt-[2cqh] max-w-[80cqw] text-balance font-display text-[6cqw] leading-[1.04]">
        {scene.content.heading || scene.title}
      </h1>
      <GoldRule className="mt-[2.8cqh] w-[20cqw]" />
      <p className="mt-[2.6cqh] max-w-[62cqw] whitespace-pre-line text-balance text-[1.55cqw] leading-[1.7] text-[var(--stage-muted)]">
        {scene.content.body ||
          "Take out your phone and join the quiz using the game PIN on screen."}
      </p>
      <div className="mt-[3.4cqh] flex items-center gap-[1.2cqw] rounded-full border border-[var(--stage-accent)]/30 bg-[var(--stage-accent)]/5 px-[2.4cqw] py-[1.3cqh]">
        <span className="h-[0.8cqh] w-[0.8cqh] animate-pulse rounded-full bg-[var(--stage-accent)]" />
        <span className="text-[1.1cqw] uppercase tracking-[0.3em] text-[var(--stage-accent-2)]">
          Waiting for the host to launch
        </span>
      </div>
    </div>
  );
}

function CountdownScene({
  scene,
  event,
}: {
  scene: PublicScene;
  event: PublicEvent;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <Eyebrow>{scene.content.heading || event.title}</Eyebrow>
      <h1 className="mt-[2.2cqh] max-w-[80cqw] text-balance font-display text-[6cqw] leading-[1.04]">
        {scene.content.subheading || "Session begins in"}
      </h1>
      <GoldRule className="mt-[2.8cqh] w-[22cqw]" />
      {scene.content.body ? (
        <p className="mt-[2.6cqh] max-w-[62cqw] whitespace-pre-line text-balance text-[1.55cqw] leading-[1.7] text-[var(--stage-muted)]">
          {scene.content.body}
        </p>
      ) : null}
      <div className="mt-[3.4cqh] flex items-center gap-[1.2cqw] rounded-full border border-[var(--stage-accent)]/30 bg-[var(--stage-accent)]/5 px-[2.4cqw] py-[1.3cqh]">
        <span className="h-[0.8cqh] w-[0.8cqh] animate-pulse rounded-full bg-[var(--stage-accent)]" />
        <span className="text-[1.1cqw] uppercase tracking-[0.3em] text-[var(--stage-accent-2)]">
          The host will start the countdown shortly
        </span>
      </div>
    </div>
  );
}

function FixtureCard({ fixture }: { fixture: PublicFixture }) {
  const completed = fixture.status === "completed";
  const live = fixture.status === "live";
  const hasScore = fixture.scoreA !== null && fixture.scoreB !== null;

  return (
    <div
      className={`rounded-xl border px-[1.6cqw] py-[1.6cqh] ${
        live
          ? "border-[var(--stage-accent)]/60 bg-[var(--stage-accent)]/10"
          : "border-white/10 bg-white/[0.04]"
      }`}
    >
      <div className="flex items-center justify-between gap-[1cqw]">
        <p className="truncate text-[0.95cqw] uppercase tracking-[0.24em] text-[var(--stage-accent)]">
          {fixture.stage}
        </p>
        {live ? (
          <span className="flex items-center gap-[0.5cqw] text-[0.85cqw] uppercase tracking-[0.2em] text-[var(--stage-accent-2)]">
            <span className="h-[0.7cqh] w-[0.7cqh] animate-pulse rounded-full bg-[var(--stage-accent)]" />
            Live
          </span>
        ) : completed ? (
          <span className="text-[0.85cqw] uppercase tracking-[0.2em] text-[var(--stage-muted)]">
            Full time
          </span>
        ) : (
          <span className="text-[0.85cqw] uppercase tracking-[0.2em] text-[var(--stage-muted)]">
            {formatFixtureKickoff(fixture.scheduledAt) ?? "Upcoming"}
          </span>
        )}
      </div>
      <div className="mt-[1.2cqh] flex items-center justify-between gap-[1.2cqw]">
        <p className="min-w-0 flex-1 truncate text-right text-[1.7cqw] font-semibold tracking-wide">
          {fixture.teamA}
        </p>
        {hasScore ? (
          <p className="shrink-0 font-display text-[2.2cqw] text-[var(--stage-accent-2)]">
            {fixture.scoreA}
            <span className="mx-[0.6cqw] text-[var(--stage-muted)]">–</span>
            {fixture.scoreB}
          </p>
        ) : (
          <p className="shrink-0 font-display text-[1.5cqw] uppercase tracking-[0.3em] text-[var(--stage-accent)]">
            vs
          </p>
        )}
        <p className="min-w-0 flex-1 truncate text-[1.7cqw] font-semibold tracking-wide">
          {fixture.teamB}
        </p>
      </div>
      {fixture.venue ? (
        <p className="mt-[0.8cqh] truncate text-center text-[0.9cqw] uppercase tracking-[0.2em] text-[var(--stage-muted)]">
          {fixture.venue}
        </p>
      ) : null}
    </div>
  );
}

function ImageTopicScene({
  scene,
  event,
}: {
  scene: PublicScene;
  event: PublicEvent;
}) {
  const overrides = scene.imageOverrides;
  const speakerName = overrides?.speakerName ?? scene.speaker?.fullName;
  const topic = overrides?.topic ?? scene.content.heading ?? scene.title;
  const stance = overrides?.stance;

  return (
    <div className="relative flex h-full items-center">
      <div className="pointer-events-none absolute inset-0">
        {scene.backgroundUrl ? (
          <img
            src={scene.backgroundUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[var(--stage-surface)]">
            <span className="font-display text-[5cqw] text-[var(--stage-accent)]/60">
              Image background
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.65)_0%,rgba(0,0,0,0.85)_100%)]" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center gap-[2cqw] px-[4cqw]">
        <div className="flex flex-col items-center">
          <p className="text-[1.1cqw] uppercase tracking-[0.32em] text-[var(--stage-accent)]/80">
            {stance ? (stance === "for" ? "FOR" : "AGAINST") : "Topic"}
          </p>
          <h1 className="mt-[0.8cqh] text-balance font-display text-[5cqw] leading-none text-white">
            {topic}
          </h1>
          {speakerName ? (
            <p className="mt-[0.6cqh] text-[2cqw] font-medium text-[var(--stage-text)]/90">
              {speakerName}
            </p>
          ) : null}
        </div>
        {stance ? (
          <div className="rounded-full border-2 px-[2cqw] py-[0.4cqh] text-[1.2cqw] font-semibold uppercase tracking-[0.2em] text-[var(--stage-accent)]">
            {stance === "for" ? "FOR" : "AGAINST"}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function FixturesScene({ scene }: { scene: PublicScene }) {
  const fixtures = scene.fixtures ?? [];
  const stages = Array.from(new Set(fixtures.map((item) => item.stage)));

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 text-center">
        <p className="text-[1.15cqw] font-semibold uppercase tracking-[0.42em] text-[var(--stage-accent)]">
          Fixtures & Table Draw
        </p>
        <h2 className="mt-[1.2cqh] font-display text-[4.2cqw] leading-none">
          {scene.content.heading || scene.title}
        </h2>
        {scene.content.subheading ? (
          <p className="mt-[1cqh] text-[1.35cqw] text-[var(--stage-muted)]">
            {scene.content.subheading}
          </p>
        ) : null}
        <div className="gold-rule mx-auto mt-[1.6cqh] w-[26cqw]" />
      </div>

      <div className="mt-[2.2cqh] min-h-0 flex-1 overflow-y-auto">
        {fixtures.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="font-display text-[2.4cqw] text-[var(--stage-muted)]">
              The draw will appear here.
            </p>
          </div>
        ) : stages.length <= 1 ? (
          <div className="mx-auto grid max-w-[80cqw] grid-cols-1 gap-[1.2cqh] sm:grid-cols-2">
            {fixtures.map((fixture) => (
              <FixtureCard key={fixture.id} fixture={fixture} />
            ))}
          </div>
        ) : (
          <div className="mx-auto flex max-w-[86cqw] flex-col gap-[2cqh]">
            {stages.map((stage) => (
              <div key={stage}>
                <p className="mb-[0.8cqh] text-center text-[1cqw] uppercase tracking-[0.3em] text-[var(--stage-accent-2)]">
                  {stage}
                </p>
                <div className="grid grid-cols-1 gap-[1cqh] sm:grid-cols-2">
                  {fixtures
                    .filter((fixture) => fixture.stage === stage)
                    .map((fixture) => (
                      <FixtureCard key={fixture.id} fixture={fixture} />
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GenericScene({
  scene,
  event,
}: {
  scene: PublicScene;
  event: PublicEvent;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <Eyebrow>{event.title}</Eyebrow>
      <h1 className="mt-[2.2cqh] max-w-[82cqw] text-balance font-display text-[5.6cqw] leading-[1.05]">
        {scene.content.heading || scene.title}
      </h1>
      {scene.content.subheading ? (
        <p className="mt-[1.8cqh] max-w-[66cqw] text-[1.8cqw] text-[var(--stage-accent-2)]">
          {scene.content.subheading}
        </p>
      ) : null}
      <GoldRule className="mt-[2.6cqh] w-[18cqw]" />
      {scene.content.body ? (
        <p className="mt-[2.4cqh] max-w-[66cqw] whitespace-pre-line text-balance text-[1.5cqw] leading-[1.7] text-[var(--stage-muted)]">
          {scene.content.body}
        </p>
      ) : null}
    </div>
  );
}

export function SceneView({
  scene,
  event,
  logos,
  scoreboard,
  className,
}: {
  scene: PublicScene;
  event: PublicEvent;
  logos: PublicLogo[];
  scoreboard?: PublicScoreboard | null;
  className?: string;
}) {
  const showLogos = logosVisibleFor(
    event.logoVisibility,
    scene.logoVisibility,
    scene.type,
  );

  let content: React.ReactNode = null;
  switch (scene.type) {
    case "opening":
      content = <OpeningScene scene={scene} event={event} />;
      break;
    case "welcome":
      content = <WelcomeScene scene={scene} event={event} />;
      break;
    case "speaker_intro":
      content = <SpeakerScene scene={scene} mode="intro" />;
      break;
    case "speaking_now":
      content = <SpeakerScene scene={scene} mode="speaking" />;
      break;
    case "citation":
      content = <CitationScene scene={scene} event={event} />;
      break;
    case "topic":
      content = <TopicScene scene={scene} event={event} />;
      break;
    case "announcement":
      content = <AnnouncementScene scene={scene} />;
      break;
    case "break":
      content = <BreakScene scene={scene} event={event} />;
      break;
    case "closing":
      content = <ClosingScene scene={scene} event={event} />;
      break;
    case "quiz_intro":
      content = <QuizIntroScene scene={scene} />;
      break;
    case "countdown":
      content = <CountdownScene scene={scene} event={event} />;
      break;
    case "fixtures":
      content = <FixturesScene scene={scene} />;
      break;
    case "image_topic":
      content = <ImageTopicScene scene={scene} event={event} />;
      break;
    case "scoreboard":
      content = scoreboard ? (
        <LeaderboardView scoreboard={scoreboard} />
      ) : (
        <GenericScene scene={scene} event={event} />
      );
      break;
    default:
      content = <GenericScene scene={scene} event={event} />;
  }

  return (
    <Stage
      event={event}
      logos={logos}
      showLogos={showLogos}
      className={className}
    >
      <div className="relative h-full">
        <SceneBackdrop scene={scene} />
        <AnimatePresence mode="wait" initial={false}>
          <SceneMotion
            key={`${scene.id}:${scene.animation}`}
            preset={scene.animation}
            className="relative"
          >
            {content}
          </SceneMotion>
        </AnimatePresence>
      </div>
    </Stage>
  );
}
