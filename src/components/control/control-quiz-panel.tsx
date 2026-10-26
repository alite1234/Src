"use client";

import { useMemo, useState } from "react";
import {
  ClipboardCopy,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Square,
  TimerReset,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/field";
import { useCountdown } from "@/lib/use-countdown";
import type { ControlQuizState, ControlStatePayload } from "@/lib/types";
import { formatClock, formatScore, ordinal } from "@/lib/utils";
import type { ControlSend } from "./types";

function statusTone(status: ControlQuizState["status"]) {
  if (status === "question") return "success" as const;
  if (status === "paused") return "danger" as const;
  if (status === "lobby") return "gold" as const;
  return "neutral" as const;
}

function statusLabel(status: ControlQuizState["status"]) {
  switch (status) {
    case "lobby":
      return "Lobby open";
    case "question":
      return "Question live";
    case "paused":
      return "Paused";
    case "reveal":
      return "Answer revealed";
    case "leaderboard":
      return "Leaderboard";
    case "ended":
      return "Quiz ended";
    default:
      return status;
  }
}

function CopyPin({ pin }: { pin: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(pin);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          setCopied(false);
        }
      }}
    >
      <ClipboardCopy className="h-3.5 w-3.5" />
      {copied ? "Copied" : "Copy PIN"}
    </Button>
  );
}

function Action({
  label,
  onClick,
  icon,
  busy,
  variant = "secondary",
  confirm,
}: {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  busy: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "subtle";
  confirm?: string;
}) {
  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      disabled={busy}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        onClick();
      }}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}
      {label}
    </Button>
  );
}

function QuestionClock({ quiz }: { quiz: ControlQuizState }) {
  const question = quiz.question;
  const remaining = useCountdown({
    endsAt: question?.endsAt,
    pausedRemainingMs: question?.pausedRemainingMs ?? quiz.remainingMs,
    running: question?.status === "question",
    intervalMs: 200,
  });

  return (
    <span className="font-display text-2xl tabular-nums text-white">
      {formatClock(remaining / 1000)}
    </span>
  );
}

function QuestionDetail({
  quiz,
  busyLabel,
  send,
  busy,
}: {
  quiz: ControlQuizState;
  busyLabel: string | null;
  send: ControlSend;
  busy: boolean;
}) {
  const question = quiz.question;
  if (!question) return null;
  const stats = new Map(
    (quiz.optionStats ?? []).map((stat) => [stat.optionId, stat]),
  );

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] uppercase tracking-[0.18em] text-mist-500">
            Question {question.index} of {question.total}
          </p>
          <QuestionClock quiz={quiz} />
        </div>
        <p className="mt-2 font-display text-base leading-snug text-white">
          {question.prompt}
        </p>
        <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
          {question.options.map((option, index) => {
            const correct = option.id === question.correctOptionId;
            const stat = stats.get(option.id);
            return (
              <div
                key={option.id}
                className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs ${
                  correct
                    ? "border-emerald-400/30 bg-emerald-400/[0.07] text-emerald-100"
                    : "border-white/5 bg-white/[0.02] text-mist-300"
                }`}
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-white/5 font-display text-[10px]">
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="min-w-0 flex-1">{option.text}</span>
                {stat ? (
                  <span className="shrink-0 tabular-nums text-mist-500">
                    {stat.count}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-mist-600">
          {quiz.submissionCount} of {quiz.participantCount} participants have
          answered
        </p>
      </div>

      <fieldset disabled={busy} className="flex flex-wrap gap-2">
        {quiz.status === "question" ? (
          <Action
            label="Pause"
            icon={<Pause className="h-3.5 w-3.5" />}
            busy={busyLabel === "Pause"}
            onClick={() =>
              void send("Pause", "/api/control/quiz", { action: "pause" })
            }
          variant="secondary"
          />
        ) : null}
        {quiz.status === "paused" ? (
          <Action
            label="Resume"
            icon={<Play className="h-3.5 w-3.5" />}
            busy={busyLabel === "Resume"}
            onClick={() =>
              void send("Resume", "/api/control/quiz", { action: "resume" })
            }
            variant="primary"
          />
        ) : null}
        {quiz.status === "question" || quiz.status === "paused" ? (
          <>
            <Action
              label="+10s"
              icon={<TimerReset className="h-3.5 w-3.5" />}
              busy={busyLabel === "Extend"}
              onClick={() =>
                void send("Extend", "/api/control/quiz", {
                  action: "extend",
                  seconds: 10,
                })
              }
            />
            <Action
              label="Reset timer"
              icon={<RotateCcw className="h-3.5 w-3.5" />}
              busy={busyLabel === "Reset timer"}
              onClick={() =>
                void send("Reset timer", "/api/control/quiz", {
                  action: "reset_timer",
                })
              }
            />
            <Action
              label="Reveal answer"
              busy={busyLabel === "Reveal answer"}
              onClick={() =>
                void send("Reveal answer", "/api/control/quiz", {
                  action: "reveal",
                })
              }
              variant="primary"
            />
          </>
        ) : null}
        {quiz.status === "reveal" ||
        quiz.status === "leaderboard" ||
        quiz.status === "question" ||
        quiz.status === "paused" ? (
          <Action
            label={
              quiz.currentQuestionIndex + 1 >= quiz.totalQuestions
                ? "Finish quiz"
                : "Next question"
            }
            icon={<SkipForward className="h-3.5 w-3.5" />}
            busy={busyLabel === "Next question"}
            onClick={() =>
              void send("Next question", "/api/control/quiz", {
                action: "advance",
              })
            }
            variant="secondary"
          />
        ) : null}
        {quiz.status !== "ended" ? (
          <Action
            label="Show leaderboard"
            busy={busyLabel === "Show leaderboard"}
            onClick={() =>
              void send("Show leaderboard", "/api/control/quiz", {
                action: "leaderboard",
              })
            }
          />
        ) : null}
        {quiz.status !== "ended" ? (
          <Action
            label="End quiz"
            icon={<Square className="h-3.5 w-3.5" />}
            busy={busyLabel === "End quiz"}
            onClick={() =>
              void send("End quiz", "/api/control/quiz", { action: "end" })
            }
            variant="danger"
            confirm="End the quiz for everyone? Participants will see the final leaderboard."
          />
        ) : null}
      </fieldset>

      {quiz.nextQuestionPrompt ? (
        <div className="rounded-xl border border-gold-500/15 bg-gold-500/[0.04] px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.18em] text-gold-300/80">
            Up next
          </p>
          <p className="mt-1 truncate text-xs text-mist-300">
            {quiz.nextQuestionPrompt}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function LobbyDetail({
  quiz,
  busyLabel,
  send,
  busy,
}: {
  quiz: ControlQuizState;
  busyLabel: string | null;
  send: ControlSend;
  busy: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gold-500/20 bg-gold-500/[0.05] px-3 py-2">
        <span className="text-[10px] uppercase tracking-[0.2em] text-gold-300/80">
          Game PIN
        </span>
        <span className="font-display text-3xl tracking-[0.2em] text-white">
          {quiz.pin}
        </span>
        <CopyPin pin={quiz.pin} />
        <span className="ml-auto flex items-center gap-1.5 text-xs text-mist-400">
          <Users className="h-3.5 w-3.5 text-gold-400" />
          {quiz.participantCount} joined
        </span>
      </div>

      <fieldset disabled={busy} className="flex flex-wrap gap-2">
        <Action
          label={quiz.lobbyOpen ? "Close lobby" : "Open lobby"}
          busy={busyLabel === "Lobby"}
          onClick={() =>
            void send(
              "Lobby",
              "/api/control/quiz",
              quiz.lobbyOpen
                ? { action: "close_lobby" }
                : { action: "open_lobby" },
            )
          }
        />
        <Action
          label="30s countdown"
          busy={busyLabel === "Lobby countdown"}
          onClick={() =>
            void send("Lobby countdown", "/api/control/quiz", {
              action: "lobby_countdown",
              seconds: 30,
            })
          }
        />
        <Action
          label="Start quiz"
          icon={<Play className="h-3.5 w-3.5" />}
          busy={busyLabel === "Start quiz"}
          onClick={() =>
            void send("Start quiz", "/api/control/quiz", { action: "start" })
          }
          variant="primary"
        />
        <Action
          label="End session"
          busy={busyLabel === "End quiz"}
          onClick={() =>
            void send("End quiz", "/api/control/quiz", { action: "end" })
          }
          variant="danger"
          confirm="End this quiz session?"
        />
      </fieldset>

      <div>
        <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-mist-500">
          Participants
        </p>
        {quiz.participants.length === 0 ? (
          <p className="text-xs text-mist-600">
            No participants have joined yet. Display the PIN on the projector.
          </p>
        ) : (
          <div className="grid max-h-40 gap-1 overflow-y-auto pr-1 sm:grid-cols-2">
            {quiz.participants.map((participant) => (
              <div
                key={participant.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1.5 text-xs"
              >
                <span className="truncate text-mist-300">
                  {participant.name}
                </span>
                <span className="shrink-0 tabular-nums text-mist-600">
                  {formatScore(participant.score)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Standings({
  quiz,
}: {
  quiz: ControlQuizState;
}) {
  const entries = quiz.leaderboard.slice(0, 10);
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-mist-500">
        {quiz.status === "ended" ? "Final standings" : "Live standings"}
      </p>
      {entries.length === 0 ? (
        <p className="mt-2 text-xs text-mist-600">No scores yet.</p>
      ) : (
        <ol className="mt-2 space-y-1">
          {entries.map((entry) => (
            <li
              key={entry.participantId}
              className="flex items-center gap-2 rounded-lg px-2 py-1 text-xs odd:bg-white/[0.02]"
            >
              <span className="w-8 text-gold-300">{ordinal(entry.rank)}</span>
              <span className="min-w-0 flex-1 truncate text-mist-300">
                {entry.name}
              </span>
              <span className="tabular-nums text-mist-200">
                {formatScore(entry.score)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function ControlQuizPanel({
  data,
  selectedQuizId,
  onSelectQuiz,
  send,
  busy,
  busyLabel,
}: {
  data: ControlStatePayload;
  selectedQuizId: string | null;
  onSelectQuiz: (id: string) => void;
  send: ControlSend;
  busy: boolean;
  busyLabel: string | null;
}) {
  const quiz = data.quiz;
  const effectiveSelected = useMemo(
    () =>
      quiz?.quizId ??
      selectedQuizId ??
      data.quizzes[0]?.id ??
      "",
    [data.quizzes, quiz?.quizId, selectedQuizId],
  );

  if (quiz) {
    return (
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={statusTone(quiz.status)}>
              {statusLabel(quiz.status)}
            </Badge>
            <span className="text-xs text-mist-500">{quiz.quizTitle}</span>
            <span className="text-xs text-mist-600">
              · {quiz.participantCount} participants
            </span>
          </div>
          {quiz.status === "lobby" ? (
            <LobbyDetail
              quiz={quiz}
              busyLabel={busyLabel}
              send={send}
              busy={busy}
            />
          ) : (
            <QuestionDetail
              quiz={quiz}
              busyLabel={busyLabel}
              send={send}
              busy={busy}
            />
          )}
        </div>
        <div className="space-y-3">
          <Standings quiz={quiz} />
          {quiz.status === "ended" ? (
            <Action
              label="Return projector to the summit"
              busy={busyLabel === "Return to summit"}
              onClick={() =>
                void send("Return to summit", "/api/control/quiz", {
                  action: "return_to_summit",
                })
              }
              variant="primary"
            />
          ) : null}
          <p className="text-[11px] leading-relaxed text-mist-600">
            Scores are recalculated from stored responses. The projector shows
            the same leaderboard you see here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-3">
        <p className="text-xs leading-relaxed text-mist-400">
          Launch a quiz to create a new session, PIN and lobby. Participants
          join from their phones at <span className="text-gold-200">/play</span>.
        </p>
        {data.quizzes.length === 0 ? (
          <EmptyState
            title="No quizzes available"
            description="Create a quiz and add questions in the admin dashboard first."
          />
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select
              value={effectiveSelected}
              onChange={(event) => onSelectQuiz(event.target.value)}
              className="h-10"
              aria-label="Select quiz"
            >
              {data.quizzes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title} ({item.questionCount} questions)
                </option>
              ))}
            </Select>
            <Action
              label="Launch quiz"
              icon={<Play className="h-3.5 w-3.5" />}
              busy={busyLabel === "Launch quiz"}
              onClick={() =>
                void send("Launch quiz", "/api/control/quiz", {
                  action: "launch",
                  quizId: effectiveSelected,
                })
              }
              variant="primary"
            />
          </div>
        )}
      </div>
      <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 text-xs leading-relaxed text-mist-500">
        <p className="font-display text-sm text-mist-200">Quiz flow</p>
        <ol className="mt-2 list-decimal space-y-1 pl-4">
          <li>Launch to open the lobby and show the PIN.</li>
          <li>Read the participant list as the room joins.</li>
          <li>Start the quiz when ready.</li>
          <li>Pause, extend or reset the timer if needed.</li>
          <li>Reveal the answer, then advance.</li>
          <li>Show standings between rounds and end the quiz.</li>
        </ol>
      </div>
    </div>
  );
}
