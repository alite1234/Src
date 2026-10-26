"use client";

import { Radio } from "lucide-react";

import type {
  PublicEvent,
  PublicLivePayload,
  PublicLiveState,
  PublicLogo,
  PublicQuizState,
  PublicScene,
  PublicScoreboard,
} from "@/lib/types";
import { visibleForKey } from "@/lib/logo-visibility";
import { formatEventDate } from "@/lib/utils";
import { CountdownView } from "./countdown-view";
import { QuizView } from "./quiz-view";
import { SceneView } from "./scene-view";
import { Stage } from "./stage";

export type ProjectionPayload = {
  event: PublicEvent | null;
  logos: PublicLogo[];
  live: PublicLiveState | null;
  scene: PublicScene | null;
  scoreboard: PublicScoreboard | null;
  quiz: PublicQuizState | null;
};

function Standby({
  payload,
  label = "Standby",
  headline,
  detail,
}: {
  payload: ProjectionPayload;
  label?: string;
  headline?: string;
  detail?: string;
}) {
  const { event, logos } = payload;
  if (!event) return null;
  const showLogos = visibleForKey(event.logoVisibility, "opening");
  const dateVenue = [formatEventDate(event.eventDate), event.venue]
    .filter(Boolean)
    .join("  ·  ");

  return (
    <Stage event={event} logos={logos} showLogos={showLogos}>
      <div className="flex h-full flex-col items-center justify-center text-center">
        <div className="flex items-center gap-[1cqw]">
          <span className="h-[0.9cqh] w-[0.9cqh] animate-pulse rounded-full bg-[var(--stage-accent)]" />
          <p className="text-[1.15cqw] font-semibold uppercase tracking-[0.4em] text-[var(--stage-accent)]">
            {label}
          </p>
        </div>
        <h1 className="mt-[2.4cqh] max-w-[80cqw] text-balance font-display text-[5.6cqw] leading-[1.05]">
          {headline ?? event.title}
        </h1>
        <div className="gold-rule mt-[2.8cqh] w-[22cqw]" />
        <p className="mt-[2.4cqh] max-w-[58cqw] text-balance text-[1.45cqw] leading-relaxed text-[var(--stage-muted)]">
          {detail ??
            event.subtitle ??
            "The programme will begin shortly. Please take your seats."}
        </p>
        {dateVenue ? (
          <p className="mt-[3.2cqh] text-[1.05cqw] uppercase tracking-[0.28em] text-[var(--stage-accent-2)]">
            {dateVenue}
          </p>
        ) : null}
      </div>
    </Stage>
  );
}

export function ProjectionSurface({
  payload,
  serverNow,
  standbyLabel,
  standbyDetail,
}: {
  payload: ProjectionPayload;
  serverNow: () => number;
  standbyLabel?: string;
  standbyDetail?: string;
}) {
  const { event, logos, live, scene, scoreboard, quiz } = payload;

  if (!event) {
    return (
      <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-[#030917] text-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#0b1f45_0%,#030917_68%)]" />
        <div className="pattern-rays absolute inset-0 opacity-50" />
        <div className="relative z-10 px-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-gold-500/30 bg-gold-500/10">
            <Radio className="h-6 w-6 text-gold-400" />
          </div>
          <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.36em] text-gold-400/80">
            SRC Legislative Summit
          </p>
          <h1 className="mt-4 font-display text-4xl text-white sm:text-5xl">
            Projector ready
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-mist-500">
            Awaiting an active summit. Create and activate a summit in the admin
            dashboard, then return this screen to full view.
          </p>
        </div>
      </div>
    );
  }

  if (live?.mode === "blank") {
    return <div className="h-full w-full bg-black" />;
  }

  if (live?.mode === "countdown") {
    return (
      <CountdownView
        event={event}
        logos={logos}
        live={live}
        serverNow={serverNow}
      />
    );
  }

  if (live?.mode === "quiz") {
    if (quiz) {
      return (
        <QuizView
          event={event}
          logos={logos}
          quiz={quiz}
          serverNow={serverNow}
        />
      );
    }
    return (
      <Stage
        event={event}
        logos={logos}
        showLogos={visibleForKey(event.logoVisibility, "quiz")}
      >
        <div className="flex h-full flex-col items-center justify-center text-center">
          <p className="text-[1.1cqw] font-semibold uppercase tracking-[0.4em] text-[var(--stage-accent)]">
            Live quiz
          </p>
          <h1 className="mt-[2cqh] font-display text-[5cqw]">
            Preparing the quiz…
          </h1>
          <p className="mt-[2cqh] text-[1.5cqw] text-[var(--stage-muted)]">
            Watch this screen for the game PIN.
          </p>
        </div>
      </Stage>
    );
  }

  if (live?.mode === "scene" && scene) {
    return (
      <SceneView
        scene={scene}
        event={event}
        logos={logos}
        scoreboard={scoreboard}
      />
    );
  }

  return (
    <Standby
      payload={payload}
      label={
        standbyLabel ??
        (live?.mode === "holding" ? "Standby" : "Projection")
      }
      detail={
        standbyDetail ??
        (live?.mode === "scene"
          ? "The next scene is being prepared."
          : undefined)
      }
    />
  );
}

export type { PublicLivePayload };
