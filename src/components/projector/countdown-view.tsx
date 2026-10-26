"use client";

import { useCountdown } from "@/lib/use-countdown";
import type {
  PublicEvent,
  PublicLiveState,
  PublicLogo,
} from "@/lib/types";
import { visibleForKey } from "@/lib/logo-visibility";
import { Stage } from "./stage";

function clock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0",
    )}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0",
  )}`;
}

export function CountdownView({
  event,
  logos,
  live,
  serverNow,
}: {
  event: PublicEvent;
  logos: PublicLogo[];
  live: PublicLiveState;
  serverNow: () => number;
}) {
  const remaining = useCountdown({
    endsAt: live.countdownEndsAt,
    pausedRemainingMs: live.countdownRemainingMs,
    running: live.countdownRunning,
    serverNow,
  });
  const done = remaining <= 0;
  const showLogos = visibleForKey(event.logoVisibility, "countdown");

  return (
    <Stage event={event} logos={logos} showLogos={showLogos}>
      <div className="flex h-full flex-col items-center justify-center text-center">
        <p className="text-[1.2cqw] font-semibold uppercase tracking-[0.4em] text-[var(--stage-accent)]">
          {live.countdownLabel || "Session begins in"}
        </p>

        <div className="mt-[3cqh] font-display text-[15cqw] leading-none tabular-nums tracking-[0.02em]">
          {clock(remaining)}
        </div>

        <div className="gold-rule mt-[2.6cqh] w-[26cqw]" />

        <p className="mt-[2.6cqh] font-display text-[2.4cqw] text-[var(--stage-accent-2)]">
          {done ? "Starting now" : event.title}
        </p>
        <p className="mt-[1cqh] text-[1.15cqw] uppercase tracking-[0.28em] text-[var(--stage-muted)]">
          {live.countdownRunning
            ? "Please take your seats"
            : "The countdown is paused"}
        </p>
      </div>
    </Stage>
  );
}
