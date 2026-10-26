"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import QRCode from "qrcode";
import { Check, Pause, Timer, Users } from "lucide-react";

import { useCountdown } from "@/lib/use-countdown";
import type {
  PublicEvent,
  PublicLogo,
  PublicQuizQuestion,
  PublicQuizState,
} from "@/lib/types";
import { visibleForKey } from "@/lib/logo-visibility";
import { formatClock, formatScore, ordinal } from "@/lib/utils";
import { Stage } from "./stage";

const OPTION_STYLES = [
  {
    bg: "border-red-400/30 bg-[#a51d2a]",
    badge: "bg-white/15",
  },
  {
    bg: "border-sky-400/30 bg-[#1d4fa8]",
    badge: "bg-white/15",
  },
  {
    bg: "border-amber-300/30 bg-[#a86a12]",
    badge: "bg-white/15",
  },
  {
    bg: "border-emerald-400/30 bg-[#0d6b4f]",
    badge: "bg-white/15",
  },
];

function JoinCode({ pin }: { pin: string }) {
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    const joinUrl = `${window.location.origin}/play?pin=${pin}`;
    let cancelled = false;
    QRCode.toDataURL(joinUrl, {
      margin: 1,
      width: 560,
      color: { dark: "#040d1f", light: "#f7f1de" },
      errorCorrectionLevel: "M",
    })
      .then((data) => {
        if (!cancelled) setQr(data);
      })
      .catch(() => {
        if (!cancelled) setQr(null);
      });
    return () => {
      cancelled = true;
    };
  }, [pin]);

  return (
    <div className="flex flex-col items-center gap-[1.6cqh]">
      <div className="rounded-2xl border border-[var(--stage-accent)]/40 bg-[#f7f1de] p-[1.2cqw] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)]">
        {qr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qr}
            alt="QR code to join the live quiz"
            className="h-[21cqw] w-[21cqw]"
          />
        ) : (
          <div className="flex h-[21cqw] w-[21cqw] items-center justify-center text-center text-[1.1cqw] text-navy-950/70">
            Generating QR code…
          </div>
        )}
      </div>
      <p className="max-w-[30cqw] truncate text-[1.1cqw] text-[var(--stage-muted)]">
        Scan to join · /play
      </p>
    </div>
  );
}

function LobbyClock({
  endsAt,
  serverNow,
}: {
  endsAt: string;
  serverNow: () => number;
}) {
  const remaining = useCountdown({ endsAt, serverNow });
  if (remaining <= 0) {
    return (
      <span className="text-[var(--stage-accent-2)]">Starting shortly…</span>
    );
  }
  return (
    <span className="tabular-nums text-[var(--stage-accent-2)]">
      {formatClock(remaining / 1000)}
    </span>
  );
}

function QuizLobby({
  quiz,
  serverNow,
}: {
  quiz: PublicQuizState;
  serverNow: () => number;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-start justify-between gap-4">
        <div>
          <p className="text-[1.1cqw] font-semibold uppercase tracking-[0.4em] text-[var(--stage-accent)]">
            Live quiz · Lobby
          </p>
          <h1 className="mt-[1.2cqh] max-w-[56cqw] text-balance font-display text-[4.2cqw] leading-[1.04]">
            {quiz.quizTitle}
          </h1>
        </div>
        <div className="flex items-center gap-[0.8cqw] rounded-full border border-white/10 bg-white/[0.04] px-[1.6cqw] py-[0.9cqh] text-[1.2cqw]">
          <Users className="h-[1.6cqw] w-[1.6cqw] text-[var(--stage-accent)]" />
          <span className="tabular-nums">{quiz.participantCount}</span>
          <span className="text-[var(--stage-muted)]">joined</span>
        </div>
      </div>

      <div className="mt-[4cqh] grid min-h-0 flex-1 grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)] items-center gap-[5cqw]">
        <div>
          <p className="text-[1.4cqw] uppercase tracking-[0.26em] text-[var(--stage-muted)]">
            Join at <span className="text-[var(--stage-text)]">/play</span> with
            the game PIN
          </p>
          <div className="mt-[2cqh] flex gap-[1cqw]">
            {quiz.pin.split("").map((digit, index) => (
              <span
                key={`${digit}-${index}`}
                className="flex h-[11cqh] w-[7.4cqw] items-center justify-center rounded-xl border border-[var(--stage-accent)]/35 bg-white/[0.05] font-display text-[6cqw] leading-none text-[var(--stage-text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
              >
                {digit}
              </span>
            ))}
          </div>
          <div className="mt-[3cqh] flex items-center gap-[1cqw] text-[1.45cqw]">
            <span className="h-[0.9cqh] w-[0.9cqh] animate-pulse rounded-full bg-emerald-400" />
            {quiz.lobbyOpen ? (
              quiz.lobbyEndsAt ? (
                <span className="text-[var(--stage-muted)]">
                  Lobby closes in{" "}
                  <LobbyClock endsAt={quiz.lobbyEndsAt} serverNow={serverNow} />
                </span>
              ) : (
                <span className="text-[var(--stage-muted)]">
                  The lobby is open — waiting for the host to begin
                </span>
              )
            ) : (
              <span className="text-amber-200">
                The lobby is closed. Ask the host to reopen it.
              </span>
            )}
          </div>
        </div>

        <JoinCode pin={quiz.pin} />
      </div>

      <p className="shrink-0 text-center text-[1.1cqw] uppercase tracking-[0.3em] text-[var(--stage-muted)]">
        Answer on your phone · Scores update live
      </p>
    </div>
  );
}

function QuestionTimer({
  question,
  serverNow,
}: {
  question: PublicQuizQuestion;
  serverNow: () => number;
}) {
  const paused = question.status === "paused";
  const remaining = useCountdown({
    endsAt: question.endsAt,
    pausedRemainingMs: question.pausedRemainingMs,
    running: question.status === "question",
    serverNow,
  });
  const seconds = Math.max(0, Math.ceil(remaining / 1000));
  const low = seconds <= 5;
  const totalMs = Math.max(1, question.durationSeconds * 1000);

  return (
    <div className="flex items-center gap-[1.6cqw]">
      <div
        className={`relative flex h-[10cqw] w-[10cqw] items-center justify-center rounded-full border-2 ${
          paused
            ? "border-amber-300/60 bg-amber-400/10 text-amber-100"
            : low
              ? "border-red-400/70 bg-red-500/15 text-red-100"
              : "border-[var(--stage-accent)]/45 bg-[var(--stage-accent)]/10 text-[var(--stage-text)]"
        }`}
      >
        {paused ? (
          <Pause className="h-[3.4cqw] w-[3.4cqw]" />
        ) : (
          <span className="font-display text-[4.4cqw] leading-none tabular-nums">
            {seconds}
          </span>
        )}
        <div className="absolute inset-x-[8%] bottom-[-1.1cqh] h-[0.5cqh] overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full transition-[width] duration-300 ${
              low ? "bg-red-400" : "bg-[var(--stage-accent)]"
            }`}
            style={{
              width: `${Math.max(
                0,
                Math.min(100, (remaining / totalMs) * 100),
              )}%`,
            }}
          />
        </div>
      </div>
      <div>
        <p className="text-[1.05cqw] uppercase tracking-[0.22em] text-[var(--stage-muted)]">
          {paused ? "Paused" : low ? "Time" : "Seconds"}
        </p>
        <p className="mt-[0.4cqh] font-display text-[1.75cqw]">
          {formatClock(seconds)}
        </p>
      </div>
    </div>
  );
}

function QuestionView({
  quiz,
  question,
  serverNow,
}: {
  quiz: PublicQuizState;
  question: PublicQuizQuestion;
  serverNow: () => number;
}) {
  const revealed =
    quiz.status === "reveal" ||
    quiz.status === "leaderboard" ||
    quiz.status === "ended" ||
    Boolean(question.correctOptionId);
  const stats = quiz.optionStats ?? [];
  const submitted = stats.reduce((sum, stat) => sum + stat.count, 0);
  const promptSize =
    question.prompt.length > 160
      ? "text-[3.1cqw]"
      : question.prompt.length > 90
        ? "text-[3.7cqw]"
        : "text-[4.3cqw]";

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[1.02cqw] font-semibold uppercase tracking-[0.3em] text-[var(--stage-accent)]">
            {quiz.quizTitle}
          </p>
          <p className="mt-[0.5cqh] text-[1.15cqw] uppercase tracking-[0.22em] text-[var(--stage-muted)]">
            Question {question.index} of {question.total}
            {revealed ? " · Answer revealed" : ""}
          </p>
        </div>
        <QuestionTimer question={question} serverNow={serverNow} />
      </div>

      <h1
        className={`mt-[3cqh] max-h-[21cqh] shrink-0 text-balance text-center font-display ${promptSize} leading-[1.12]`}
      >
        {question.prompt}
      </h1>

      <div className="mt-[3.2cqh] grid min-h-0 flex-1 grid-cols-2 content-center gap-[1.6cqw]">
        {question.options.map((option, index) => {
          const style = OPTION_STYLES[index % OPTION_STYLES.length];
          const stat = stats.find((entry) => entry.optionId === option.id);
          const correct = option.id === question.correctOptionId;
          const dimmed = revealed && !correct;
          const totalAnswers = Math.max(1, submitted);
          const percent = stat ? (stat.count / totalAnswers) * 100 : 0;

          return (
            <motion.div
              key={option.id}
              initial={{ opacity: 0, y: "4%" }}
              animate={{ opacity: dimmed ? 0.35 : 1, y: "0%" }}
              transition={{ duration: 0.35, delay: index * 0.06 }}
              className={`relative flex min-h-[11cqh] items-center gap-[1.6cqw] overflow-hidden rounded-2xl border px-[2cqw] py-[1.6cqh] shadow-[0_20px_50px_-30px_rgba(0,0,0,0.9)] ${style.bg} ${
                revealed && correct
                  ? "ring-4 ring-emerald-300/80"
                  : "ring-0"
              }`}
            >
              {stat && revealed ? (
                <div
                  className="absolute inset-y-0 left-0 bg-white/10"
                  style={{ width: `${percent}%` }}
                />
              ) : null}
              <span
                className={`relative flex h-[4.4cqw] w-[4.4cqw] shrink-0 items-center justify-center rounded-lg font-display text-[2.1cqw] ${style.badge}`}
              >
                {revealed && correct ? (
                  <Check className="h-[2.4cqw] w-[2.4cqw]" />
                ) : (
                  String.fromCharCode(65 + index)
                )}
              </span>
              <span className="relative min-w-0 flex-1 text-[1.85cqw] font-medium leading-snug">
                {option.text}
              </span>
              {stat && revealed ? (
                <span className="relative shrink-0 rounded-full bg-black/25 px-[1cqw] py-[0.5cqh] text-[1.15cqw] font-semibold tabular-nums">
                  {stat.count}
                </span>
              ) : null}
            </motion.div>
          );
        })}
      </div>

      <div className="mt-[1.6cqh] flex shrink-0 items-center justify-between gap-4 text-[1.1cqw] text-[var(--stage-muted)]">
        <span className="flex items-center gap-[0.7cqw]">
          <Users className="h-[1.4cqw] w-[1.4cqw] text-[var(--stage-accent)]" />
          {quiz.participantCount} participants
        </span>
        <span className="flex items-center gap-[0.7cqw]">
          <Timer className="h-[1.4cqw] w-[1.4cqw] text-[var(--stage-accent)]" />
          {revealed
            ? `${submitted} answers recorded`
            : `${quiz.submissionCount} / ${quiz.participantCount} answered`}
        </span>
      </div>
    </div>
  );
}

function LeaderboardScreen({
  quiz,
}: {
  quiz: PublicQuizState;
}) {
  const entries = quiz.leaderboard ?? [];
  const finished = quiz.status === "ended";
  const shown = entries.slice(0, 10);

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 text-center">
        <p className="text-[1.1cqw] font-semibold uppercase tracking-[0.4em] text-[var(--stage-accent)]">
          {finished ? "Final standings" : "Current standings"}
        </p>
        <h1 className="mt-[1.2cqh] font-display text-[4.8cqw] leading-none">
          Leaderboard
        </h1>
        <div className="gold-rule mx-auto mt-[1.8cqh] w-[24cqw]" />
      </div>

      <div className="mt-[3cqh] min-h-0 flex-1">
        {shown.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[1.8cqw] text-[var(--stage-muted)]">
            The standings will appear here.
          </div>
        ) : (
          <ol className="mx-auto flex max-w-[72cqw] flex-col gap-[1.1cqh]">
            {shown.map((entry, index) => (
              <motion.li
                key={entry.participantId}
                initial={{ opacity: 0, x: "-4%" }}
                animate={{ opacity: 1, x: "0%" }}
                transition={{ duration: 0.4, delay: index * 0.06 }}
                className={`flex items-center gap-[1.6cqw] rounded-xl border px-[1.8cqw] py-[1.2cqh] ${
                  index === 0
                    ? "border-[var(--stage-accent)]/55 bg-[var(--stage-accent)]/12"
                    : index < 3
                      ? "border-white/15 bg-white/[0.055]"
                      : "border-white/8 bg-white/[0.025]"
                }`}
              >
                <span className="w-[4.2cqw] font-display text-[2.2cqw] text-[var(--stage-accent)]">
                  {ordinal(entry.rank)}
                </span>
                <span className="min-w-0 flex-1 truncate text-[1.95cqw] font-medium">
                  {entry.name}
                </span>
                <span className="font-display text-[2.15cqw] text-[var(--stage-accent-2)] tabular-nums">
                  {formatScore(entry.score)}
                </span>
              </motion.li>
            ))}
          </ol>
        )}
      </div>

      <p className="shrink-0 text-center text-[1.05cqw] uppercase tracking-[0.28em] text-[var(--stage-muted)]">
        {quiz.participantCount} participants · {quiz.quizTitle}
      </p>
    </div>
  );
}

function QuizWaiting() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <p className="text-[1.1cqw] font-semibold uppercase tracking-[0.4em] text-[var(--stage-accent)]">
        Live quiz
      </p>
      <h1 className="mt-[2cqh] font-display text-[5cqw]">
        Preparing the next question…
      </h1>
      <p className="mt-[2cqh] text-[1.5cqw] text-[var(--stage-muted)]">
        Watch this screen and your device for the next step.
      </p>
    </div>
  );
}

export function QuizView({
  event,
  logos,
  quiz,
  serverNow,
}: {
  event: PublicEvent;
  logos: PublicLogo[];
  quiz: PublicQuizState;
  serverNow: () => number;
}) {
  const showLogos = visibleForKey(event.logoVisibility, "quiz");

  let content: React.ReactNode;
  if (quiz.status === "lobby") {
    content = <QuizLobby quiz={quiz} serverNow={serverNow} />;
  } else if (
    quiz.status === "leaderboard" ||
    quiz.status === "ended"
  ) {
    content = <LeaderboardScreen quiz={quiz} />;
  } else if (quiz.question) {
    content = (
      <QuestionView quiz={quiz} question={quiz.question} serverNow={serverNow} />
    );
  } else {
    content = <QuizWaiting />;
  }

  return (
    <Stage event={event} logos={logos} showLogos={showLogos}>
      {content}
    </Stage>
  );
}
