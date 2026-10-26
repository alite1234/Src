"use client";

import { useCallback, useState } from "react";
import {
  Check,
  LogOut,
  Timer,
  Trophy,
  UserRound,
  Users,
  WifiOff,
  X,
} from "lucide-react";

import { Wordmark } from "@/components/brand/wordmark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCountdown } from "@/lib/use-countdown";
import { useLiveFeed } from "@/lib/use-live-feed";
import type {
  LeaderboardEntry,
  ParticipantMe,
  PlayStatePayload,
  PublicQuizQuestion,
  PublicQuizState,
} from "@/lib/types";
import { cn, formatClock, formatScore, ordinal } from "@/lib/utils";

const OPTION_STYLES = [
  "border-red-400/30 bg-[#a51d2a] hover:bg-[#bc2231]",
  "border-sky-400/30 bg-[#1d4fa8] hover:bg-[#225abf]",
  "border-amber-300/30 bg-[#a86a12] hover:bg-[#bf7915]",
  "border-emerald-400/30 bg-[#0d6b4f] hover:bg-[#0f7c5b]",
];

function statusLabel(status: PublicQuizState["status"]) {
  switch (status) {
    case "lobby":
      return "Lobby";
    case "question":
      return "Question live";
    case "paused":
      return "Paused";
    case "reveal":
      return "Answer revealed";
    case "leaderboard":
      return "Standings";
    case "ended":
      return "Finished";
    default:
      return status;
  }
}

function statusTone(status: PublicQuizState["status"]) {
  if (status === "question") return "success" as const;
  if (status === "paused") return "danger" as const;
  if (status === "lobby") return "gold" as const;
  if (status === "leaderboard" || status === "ended") return "info" as const;
  return "neutral" as const;
}

function LobbyClock({
  endsAt,
  serverNow,
}: {
  endsAt: string;
  serverNow: () => number;
}) {
  const remaining = useCountdown({ endsAt, serverNow });
  if (remaining <= 0) return <>Starting shortly…</>;
  return (
    <span className="tabular-nums text-gold-200">
      {formatClock(remaining / 1000)}
    </span>
  );
}

function LobbyScreen({
  data,
  serverNow,
}: {
  data: PlayStatePayload;
  serverNow: () => number;
}) {
  const { quiz, me } = data;

  return (
    <div className="flex flex-1 flex-col justify-center py-6">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-gold-500/30 bg-gold-500/10 shadow-gold">
          <UserRound className="h-7 w-7 text-gold-300" />
        </div>
        <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.3em] text-gold-400/80">
          You&apos;re in
        </p>
        <h2 className="mt-2 truncate font-display text-3xl text-white">
          {me.name}
        </h2>
        <p className="mt-1 text-sm text-mist-400">{quiz.quizTitle}</p>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-center">
          <Users className="mx-auto h-4 w-4 text-gold-400" />
          <p className="mt-2 font-display text-2xl text-white tabular-nums">
            {quiz.participantCount}
          </p>
          <p className="text-[10px] uppercase tracking-[0.16em] text-mist-600">
            In the room
          </p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-center">
          <Trophy className="mx-auto h-4 w-4 text-gold-400" />
          <p className="mt-2 font-display text-2xl text-white tabular-nums">
            {formatScore(me.score)}
          </p>
          <p className="text-[10px] uppercase tracking-[0.16em] text-mist-600">
            Your score
          </p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-4 text-center text-sm text-mist-300">
        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
        {!quiz.lobbyOpen ? (
          <span>The lobby is closed. The host is about to begin.</span>
        ) : quiz.lobbyEndsAt ? (
          <span>
            Starting in{" "}
            <LobbyClock endsAt={quiz.lobbyEndsAt} serverNow={serverNow} />
          </span>
        ) : (
          <span>Waiting for the host to start the quiz…</span>
        )}
      </div>

      <p className="mt-8 text-center text-[11px] leading-relaxed text-mist-600">
        Keep this page open. The first question will appear here automatically.
      </p>
    </div>
  );
}

function QuestionScreen({
  quiz,
  question,
  me,
  serverNow,
  onSubmit,
}: {
  quiz: PublicQuizState;
  question: PublicQuizQuestion;
  me: ParticipantMe;
  serverNow: () => number;
  onSubmit: (optionId: string) => Promise<void>;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [localOption, setLocalOption] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const remaining = useCountdown({
    endsAt: question.endsAt,
    pausedRemainingMs: question.pausedRemainingMs,
    running: question.status === "question",
    serverNow,
    intervalMs: 100,
  });

  const answeredId = me.currentResponse?.optionId ?? localOption;
  const paused = question.status === "paused";
  const timeUp = question.status === "question" && remaining <= 0;
  const locked = Boolean(answeredId);
  const disabled = locked || paused || timeUp || submitting;
  const totalMs = Math.max(1, question.durationSeconds * 1000);
  const progress = Math.max(0, Math.min(1, remaining / totalMs));
  const answeredOption = question.options.find(
    (option) => option.id === answeredId,
  );

  const choose = async (optionId: string) => {
    if (disabled) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(optionId);
      setLocalOption(optionId);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Your answer could not be submitted.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col py-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-gold-400/80">
          Question {question.index} of {question.total}
        </p>
        <div
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs tabular-nums",
            paused
              ? "border-amber-300/30 bg-amber-300/10 text-amber-100"
              : progress < 0.25
                ? "border-red-400/30 bg-red-400/10 text-red-100"
                : "border-white/10 bg-white/[0.04] text-mist-200",
          )}
        >
          <Timer className="h-3.5 w-3.5" />
          {paused ? "Paused" : formatClock(remaining / 1000)}
        </div>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/8">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-100 ease-linear",
            progress < 0.25 ? "bg-red-400" : "bg-gold-400",
          )}
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <h2 className="mt-6 text-balance font-display text-2xl leading-snug text-white">
        {question.prompt}
      </h2>

      <div className="mt-6 space-y-2.5">
        {question.options.map((option, index) => {
          const chosen = option.id === answeredId;
          return (
            <button
              key={option.id}
              type="button"
              disabled={disabled}
              onClick={() => void choose(option.id)}
              className={cn(
                "flex min-h-14 w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium text-white transition-all",
                OPTION_STYLES[index % OPTION_STYLES.length],
                locked && !chosen && "opacity-40",
                chosen && "ring-2 ring-white/70 ring-offset-2 ring-offset-navy-950",
                disabled && "disabled:cursor-default",
              )}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/15 font-display text-xs">
                {String.fromCharCode(65 + index)}
              </span>
              <span className="min-w-0 flex-1">{option.text}</span>
              {submitting && !chosen ? null : chosen ? (
                <Check className="h-4 w-4 shrink-0" />
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-5">
        {error ? (
          <div className="rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-xs text-red-100">
            {error}
          </div>
        ) : paused ? (
          <p className="text-center text-xs text-amber-100/80">
            The host has paused the question.
          </p>
        ) : locked ? (
          <p className="text-center text-xs text-emerald-200/80">
            Locked in: {answeredOption?.text ?? "answer submitted"}. Answers
            cannot be changed.
          </p>
        ) : timeUp ? (
          <p className="text-center text-xs text-mist-400">
            Time&apos;s up. Waiting for the reveal…
          </p>
        ) : (
          <p className="text-center text-[11px] text-mist-600">
            {quiz.participantCount} players · faster correct answers earn more
          </p>
        )}
      </div>
    </div>
  );
}

function RevealScreen({
  question,
  me,
}: {
  question: PublicQuizQuestion;
  me: ParticipantMe;
}) {
  const response = me.currentResponse;
  const correctOption = question.options.find(
    (option) => option.id === question.correctOptionId,
  );
  const chosenOption = question.options.find(
    (option) => option.id === response?.optionId,
  );
  const correct = response?.isCorrect === true;

  return (
    <div className="flex flex-1 flex-col justify-center py-6">
      <div className="text-center">
        <div
          className={cn(
            "mx-auto flex h-20 w-20 items-center justify-center rounded-full border",
            correct
              ? "border-emerald-300/40 bg-emerald-400/15 text-emerald-200"
              : response
                ? "border-red-300/40 bg-red-400/10 text-red-200"
                : "border-white/15 bg-white/5 text-mist-300",
          )}
        >
          {correct ? (
            <Check className="h-9 w-9" />
          ) : response ? (
            <X className="h-9 w-9" />
          ) : (
            <Timer className="h-8 w-8" />
          )}
        </div>
        <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.28em] text-gold-400/80">
          Question {question.index} of {question.total}
        </p>
        <h2 className="mt-2 font-display text-3xl text-white">
          {correct ? "Correct!" : response ? "Not this time" : "No answer"}
        </h2>
        <p className="mt-2 text-sm text-mist-400">
          {correct
            ? `+${formatScore(response?.points ?? 0)} points`
            : response
              ? "You'll get the next one."
              : "The timer ran out before an answer was submitted."}
        </p>
      </div>

      <div className="mt-6 space-y-2.5">
        {correctOption ? (
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-emerald-200/70">
              Correct answer
            </p>
            <p className="mt-1 text-sm font-medium text-white">
              {correctOption.text}
            </p>
          </div>
        ) : null}
        {response && chosenOption && !correct ? (
          <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-mist-600">
              Your answer
            </p>
            <p className="mt-1 text-sm text-mist-300">{chosenOption.text}</p>
          </div>
        ) : null}
        <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
          <span className="text-xs text-mist-400">Total score</span>
          <span className="font-display text-xl text-gold-200 tabular-nums">
            {formatScore(me.score)}
          </span>
        </div>
      </div>

      <p className="mt-6 text-center text-[11px] text-mist-600">
        Waiting for the host to continue…
      </p>
    </div>
  );
}

function LeaderboardScreen({
  quiz,
  me,
}: {
  quiz: PublicQuizState;
  me: ParticipantMe;
}) {
  const entries = quiz.leaderboard ?? [];
  const myEntry = entries.find(
    (entry: LeaderboardEntry) => entry.participantId === me.id,
  );
  const rank = myEntry?.rank ?? me.rank;
  const final = quiz.status === "ended";
  const top = entries.slice(0, 8);

  return (
    <div className="flex flex-1 flex-col py-4">
      <div className="text-center">
        <Trophy className="mx-auto h-8 w-8 text-gold-400" />
        <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-gold-400/80">
          {final ? "Final standings" : "Live standings"}
        </p>
        <h2 className="mt-2 font-display text-3xl text-white">
          {final ? "Well played" : "The leaderboard"}
        </h2>
        <p className="mt-1 text-sm text-mist-400">{quiz.quizTitle}</p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-gold-500/25 bg-gold-500/[0.07] p-4 text-center">
          <p className="text-[10px] uppercase tracking-[0.18em] text-gold-300/70">
            Your rank
          </p>
          <p className="mt-1 font-display text-3xl text-white">
            {rank ? ordinal(rank) : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-center">
          <p className="text-[10px] uppercase tracking-[0.18em] text-mist-600">
            Your score
          </p>
          <p className="mt-1 font-display text-3xl text-white tabular-nums">
            {formatScore(me.score)}
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-1.5">
        {top.length === 0 ? (
          <p className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-6 text-center text-xs text-mist-500">
            No scores to show yet.
          </p>
        ) : (
          top.map((entry) => {
            const mine = entry.participantId === me.id;
            return (
              <div
                key={entry.participantId}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm",
                  mine
                    ? "border-gold-400/40 bg-gold-500/10"
                    : "border-white/6 bg-white/[0.02]",
                )}
              >
                <span className="w-8 text-center font-display text-base text-gold-300">
                  {entry.rank}
                </span>
                <span className="min-w-0 flex-1 truncate text-mist-200">
                  {entry.name}
                  {mine ? (
                    <span className="ml-2 text-[10px] uppercase tracking-[0.14em] text-gold-300/70">
                      You
                    </span>
                  ) : null}
                </span>
                <span className="tabular-nums text-mist-300">
                  {formatScore(entry.score)}
                </span>
              </div>
            );
          })
        )}
      </div>

      <p className="mt-6 text-center text-[11px] leading-relaxed text-mist-600">
        {final
          ? "Thanks for playing. You can close this page."
          : "Keep this page open. The next question will appear automatically."}
      </p>
    </div>
  );
}

export function PlayGame({
  initialData,
  onLeave,
}: {
  initialData: PlayStatePayload;
  onLeave: () => void;
}) {
  const { data: feed, status, refresh, serverNow } =
    useLiveFeed<PlayStatePayload>({
      url: "/api/play/state",
      sessionId: initialData.quiz.sessionId,
      pollMs: 1500,
    });
  const data = feed ?? initialData;
  const { quiz, me, event } = data;

  const submitAnswer = useCallback(
    async (optionId: string) => {
      const response = await fetch("/api/play/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      await refresh();
      if (!response.ok) {
        throw new Error(payload.error ?? "Your answer could not be submitted.");
      }
    },
    [refresh],
  );

  const leave = async () => {
    try {
      await fetch("/api/play/join", { method: "DELETE" });
    } finally {
      onLeave();
    }
  };

  const question = quiz.question;

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#0b2147_0%,#061127_46%,#030917_100%)]" />
        <div className="pattern-grid absolute inset-0 opacity-20" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:px-6">
        <header className="shrink-0">
          <div className="flex items-center justify-between gap-3">
            <Wordmark compact />
            <div className="flex items-center gap-1.5">
              <Badge tone={statusTone(quiz.status)}>
                {statusLabel(quiz.status)}
              </Badge>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (window.confirm("Leave this quiz?")) void leave();
                }}
                title="Leave quiz"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="mt-4 flex items-end justify-between gap-3 border-b border-white/5 pb-3">
            <div className="min-w-0">
              <p className="truncate text-[10px] uppercase tracking-[0.2em] text-mist-600">
                {event.title}
              </p>
              <p className="truncate text-sm text-mist-300">{quiz.quizTitle}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="max-w-36 truncate text-xs text-mist-300">
                {me.name}
              </p>
              <p className="text-[10px] uppercase tracking-[0.16em] text-gold-300/80">
                {formatScore(me.score)} pts
              </p>
            </div>
          </div>

          {status === "offline" ? (
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-amber-300/25 bg-amber-300/10 px-2.5 py-1.5 text-[11px] text-amber-100">
              <WifiOff className="h-3.5 w-3.5" />
              Reconnecting…
            </div>
          ) : null}
        </header>

        <main className="flex flex-1 flex-col">
          {quiz.status === "lobby" ? (
            <LobbyScreen data={data} serverNow={serverNow} />
          ) : quiz.status === "question" || quiz.status === "paused" ? (
            question ? (
              <QuestionScreen
                key={question.id}
                quiz={quiz}
                question={question}
                me={me}
                serverNow={serverNow}
                onSubmit={submitAnswer}
              />
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-mist-500">
                Waiting for the next question…
              </div>
            )
          ) : quiz.status === "reveal" ? (
            question ? (
              <RevealScreen question={question} me={me} />
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-mist-500">
                Waiting for the host…
              </div>
            )
          ) : (
            <LeaderboardScreen quiz={quiz} me={me} />
          )}
        </main>
      </div>
    </div>
  );
}
