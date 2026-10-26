"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  Ban,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  Layers,
  ListOrdered,
  Loader2,
  MonitorPlay,
  Pause,
  Play,
  Radio,
  RefreshCw,
  RotateCcw,
  Trophy,
  UsersRound,
  WifiOff,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/field";
import { SceneView } from "@/components/projector/scene-view";
import { ProjectionSurface } from "@/components/projector/projection-surface";
import { useCountdown } from "@/lib/use-countdown";
import { useLiveFeed, type FeedStatus } from "@/lib/use-live-feed";
import type { ControlStatePayload } from "@/lib/types";
import { cn, formatClock, formatEventDate } from "@/lib/utils";
import { ControlLibrary, type LibraryTab } from "./control-library";
import { ControlQuizPanel } from "./control-quiz-panel";
import type { ControlSend } from "./types";

type Tab = LibraryTab | "quiz";

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "scenes", label: "Scenes", icon: <Layers className="h-3.5 w-3.5" /> },
  {
    id: "speakers",
    label: "Speakers",
    icon: <UsersRound className="h-3.5 w-3.5" />,
  },
  {
    id: "queue",
    label: "Queue",
    icon: <ListOrdered className="h-3.5 w-3.5" />,
  },
  { id: "quiz", label: "Quiz", icon: <Trophy className="h-3.5 w-3.5" /> },
];

function connectionTone(status: FeedStatus) {
  if (status === "live") return "success" as const;
  if (status === "polling") return "gold" as const;
  if (status === "offline") return "danger" as const;
  return "neutral" as const;
}

function connectionLabel(status: FeedStatus) {
  if (status === "live") return "Realtime";
  if (status === "polling") return "Polling";
  if (status === "offline") return "Offline";
  return "Connecting";
}

function modeLabel(data: ControlStatePayload) {
  const mode = data.live?.mode;
  if (mode === "scene") return data.scene?.title ?? "Scene live";
  if (mode === "countdown") return "Countdown";
  if (mode === "quiz") return "Quiz";
  if (mode === "blank") return "Screen blank";
  if (mode === "holding") return "Holding";
  return "No live state";
}

function modeTone(data: ControlStatePayload) {
  const mode = data.live?.mode;
  if (mode === "scene") return "success" as const;
  if (mode === "countdown") return "gold" as const;
  if (mode === "quiz") return "info" as const;
  if (mode === "blank") return "danger" as const;
  return "neutral" as const;
}

export function ControlDashboard({
  initialData,
}: {
  initialData: ControlStatePayload;
}) {
  const { data: feed, status, refresh, serverNow } = useLiveFeed<ControlStatePayload>({
    url: "/api/control/state",
    pollMs: 2000,
  });
  const data = feed ?? initialData;

  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>("scenes");
  const [selectedOverride, setSelectedOverride] = useState<string | null>(null);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [countdownMinutes, setCountdownMinutes] = useState("5");

  const live = data.live;
  const busy = busyLabel !== null;

  const defaultSceneId = useMemo(() => {
    const liveIndex = data.queue.findIndex(
      (item) => item.scene.id === live?.sceneId,
    );
    const next =
      liveIndex >= 0
        ? data.queue[liveIndex + 1]?.scene.id
        : data.queue[0]?.scene.id;
    return (
      next ??
      live?.sceneId ??
      data.previewScenes[0]?.id ??
      null
    );
  }, [data.previewScenes, data.queue, live?.sceneId]);

  const selectedSceneId =
    selectedOverride &&
    data.previewScenes.some((scene) => scene.id === selectedOverride)
      ? selectedOverride
      : defaultSceneId;

  const selectedScene =
    data.previewScenes.find((scene) => scene.id === selectedSceneId) ??
    (data.scene?.id === selectedSceneId ? data.scene : null);

  const countdownRemaining = useCountdown({
    endsAt: live?.countdownEndsAt,
    pausedRemainingMs: live?.countdownRemainingMs ?? 0,
    running: live?.countdownRunning ?? false,
    serverNow,
  });

  const send: ControlSend = useCallback(
    async (label, url, body) => {
      setBusyLabel(label);
      setError(null);
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        if (!response.ok) {
          throw new Error(payload.error ?? "The command could not be completed.");
        }
        await refresh();
        return true;
      } catch (commandError) {
        setError(
          commandError instanceof Error
            ? commandError.message
            : "The command could not be completed.",
        );
        return false;
      } finally {
        setBusyLabel(null);
      }
    },
    [refresh],
  );

  const publishScene = useCallback(
    async (sceneId: string) => {
      const ok = await send("Display scene", "/api/control/live", {
        action: "publish",
        sceneId,
      });
      if (ok) setSelectedOverride(sceneId);
    },
    [send],
  );

  const manualRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  if (!data.event) {
    return (
      <EmptyState
        icon={<Radio className="h-6 w-6" />}
        title="No active summit"
        description="Create a summit in the admin dashboard and mark it active before using live controls."
        action={
          <Link href="/admin" className={buttonStyles({ size: "sm" })}>
            Open admin dashboard
          </Link>
        }
      />
    );
  }

  const event = data.event;
  const queueIndex = data.queue.findIndex(
    (item) => item.scene.id === live?.sceneId,
  );
  const revealCount = live?.scoreboardShowAll
    ? (data.scoreboard?.totalEntries ?? 0)
    : (live?.scoreboardRevealCount ?? 0);
  const minutes = Number(countdownMinutes);
  const countdownValid = Number.isFinite(minutes) && minutes > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-gold-400/80">
            Live control
          </p>
          <h1 className="mt-1 truncate font-display text-2xl tracking-wide text-white sm:text-3xl">
            {event.title}
          </h1>
          <p className="mt-1 text-xs text-mist-500">
            {[formatEventDate(event.eventDate), event.venue]
              .filter(Boolean)
              .join("  ·  ")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={modeTone(data)}>{modeLabel(data)}</Badge>
          <Badge tone={connectionTone(status)}>
            {status === "offline" ? (
              <WifiOff className="h-3 w-3" />
            ) : (
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
            )}
            {connectionLabel(status)}
          </Badge>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void manualRefresh()}
            disabled={refreshing}
            title="Refresh live state"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", refreshing && "animate-spin")}
            />
            Refresh
          </Button>
          <Link
            href="/project"
            target="_blank"
            className={buttonStyles({ variant: "secondary", size: "sm" })}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Projector
          </Link>
        </div>
      </div>

      {error ? (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-xs text-red-100">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            className="shrink-0 text-red-200/70 underline-offset-2 hover:underline"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <Card className="overflow-hidden">
          <CardHeader
            title="Live output"
            description="What the room sees on the projector right now."
            actions={
              <>
                <Badge tone={modeTone(data)}>{modeLabel(data)}</Badge>
                {live?.mode === "scene" && live.sceneId ? (
                  <span className="text-[10px] uppercase tracking-[0.14em] text-mist-600">
                    Queue {queueIndex >= 0 ? queueIndex + 1 : "—"} /{" "}
                    {data.queue.length}
                  </span>
                ) : null}
              </>
            }
          />
          <div className="aspect-video w-full overflow-hidden bg-black">
            <ProjectionSurface payload={data} serverNow={serverNow} />
          </div>
          <CardBody className="space-y-4">
            <fieldset
              disabled={busy}
              className="flex flex-wrap items-center gap-2 border-0 p-0"
            >
              <Button
                type="button"
                variant="subtle"
                size="sm"
                onClick={() =>
                  void send("Previous scene", "/api/control/live", {
                    action: "previous",
                  })
                }
                disabled={busy || data.queue.length === 0}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() =>
                  void send("Next scene", "/api/control/live", {
                    action: "next",
                  })
                }
                disabled={busy || data.queue.length === 0}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
              <span className="mx-1 hidden h-6 w-px bg-white/8 sm:block" />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() =>
                  void send("Holding slide", "/api/control/live", {
                    action: "holding",
                  })
                }
                disabled={busy}
              >
                <Pause className="h-3.5 w-3.5" />
                Holding
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() =>
                  void send("Blank screen", "/api/control/live", {
                    action: "blank",
                  })
                }
                disabled={busy}
              >
                <Ban className="h-3.5 w-3.5" />
                Blank
              </Button>
              {selectedScene ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void publishScene(selectedScene.id)}
                  disabled={busy}
                >
                  <Play className="h-3.5 w-3.5" />
                  Show selected
                </Button>
              ) : null}
            </fieldset>

            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-mist-500">
                    Countdown
                  </p>
                  {live?.mode === "countdown" ? (
                    <span className="font-display text-lg tabular-nums text-gold-200">
                      {formatClock(countdownRemaining / 1000)}
                    </span>
                  ) : null}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Input
                    type="number"
                    min={1}
                    max={120}
                    step={1}
                    value={countdownMinutes}
                    onChange={(inputEvent) =>
                      setCountdownMinutes(inputEvent.target.value)
                    }
                    className="h-8 w-20 px-2 py-0 text-xs"
                    aria-label="Countdown minutes"
                  />
                  <span className="mr-1 text-xs text-mist-600">min</span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={busy || !countdownValid}
                    onClick={() =>
                      void send("Start countdown", "/api/control/live", {
                        action: "countdown_start",
                        seconds: Math.round(minutes * 60),
                        label: "Session begins in",
                      })
                    }
                  >
                    {busyLabel === "Start countdown" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Play className="h-3.5 w-3.5" />
                    )}
                    Start
                  </Button>
                  {live?.countdownRunning ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        void send("Pause countdown", "/api/control/live", {
                          action: "countdown_pause",
                        })
                      }
                    >
                      <Pause className="h-3.5 w-3.5" />
                      Pause
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={busy || !live?.countdownRemainingMs}
                      onClick={() =>
                        void send("Resume countdown", "/api/control/live", {
                          action: "countdown_resume",
                        })
                      }
                    >
                      <Play className="h-3.5 w-3.5" />
                      Resume
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={busy || live?.mode !== "countdown"}
                    onClick={() =>
                      void send("Reset countdown", "/api/control/live", {
                        action: "countdown_reset",
                      })
                    }
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-mist-500">
                    Scoreboard
                  </p>
                  {data.scoreboard ? (
                    <span className="text-[10px] uppercase tracking-[0.12em] text-mist-600">
                      {revealCount} / {data.scoreboard.totalEntries} revealed
                    </span>
                  ) : null}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={busy || !data.scoreboard}
                    onClick={() => {
                      setTab("scenes");
                      void send("Show scoreboard", "/api/control/live", {
                        action: "show_scoreboard",
                      });
                    }}
                  >
                    <Trophy className="h-3.5 w-3.5" />
                    Display board
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={
                      busy ||
                      !data.scoreboard ||
                      revealCount >= data.scoreboard.totalEntries
                    }
                    onClick={() =>
                      void send("Reveal next", "/api/control/live", {
                        action: "scoreboard_reveal_next",
                      })
                    }
                  >
                    Reveal next
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={busy || !data.scoreboard}
                    onClick={() =>
                      void send("Reveal all", "/api/control/live", {
                        action: "scoreboard_reveal_all",
                      })
                    }
                  >
                    Reveal all
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={busy || revealCount === 0}
                    onClick={() =>
                      void send("Hide scores", "/api/control/live", {
                        action: "scoreboard_hide",
                      })
                    }
                  >
                    Hide
                  </Button>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader
            title="Selected scene"
            description="Private preview. Nothing here is visible until you display it."
            actions={
              data.queue.some((item) => item.scene.id === selectedSceneId) ? (
                <Badge tone="gold">In queue</Badge>
              ) : null
            }
          />
          <div className="aspect-video w-full overflow-hidden bg-navy-950">
            {selectedScene ? (
              <SceneView
                scene={selectedScene}
                event={event}
                logos={data.logos}
                scoreboard={data.scoreboard}
              />
            ) : (
              <div className="flex h-full items-center justify-center px-6 text-center text-xs text-mist-600">
                Select a scene from the library below to preview it here.
              </div>
            )}
          </div>
          <CardBody className="space-y-3">
            <div className="min-h-10">
              <p className="truncate text-sm font-medium text-white">
                {selectedScene?.title ?? "No scene selected"}
              </p>
              <p className="mt-0.5 truncate text-[10px] uppercase tracking-[0.14em] text-mist-600">
                {selectedScene?.speaker?.fullName ??
                  selectedScene?.type.replaceAll("_", " ") ??
                  "Choose from the library"}
              </p>
            </div>
            <Button
              type="button"
              variant="primary"
              size="md"
              className="w-full"
              disabled={busy || !selectedScene}
              onClick={() => selectedScene && void publishScene(selectedScene.id)}
            >
              {busyLabel === "Display scene" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MonitorPlay className="h-4 w-4" />
              )}
              Display selected scene
            </Button>
            <Button
              type="button"
              variant="subtle"
              size="sm"
              className="w-full"
              disabled={!selectedScene}
              onClick={() =>
                selectedScene && setSelectedOverride(selectedScene.id)
              }
            >
              <Eye className="h-3.5 w-3.5" />
              Keep previewing
            </Button>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Presentation library"
          description="Preview any scene, browse speakers, or work straight from the queue. Data refreshes automatically."
          actions={
            <span className="text-[10px] uppercase tracking-[0.14em] text-mist-600">
              {data.previewScenes.length} scenes · {data.queue.length} queued
            </span>
          }
        />
        <div className="border-b border-white/5 px-4 pt-3">
          <div className="flex flex-wrap gap-1">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-t-lg border-b-2 px-3 py-2 text-xs font-medium transition-colors",
                  tab === item.id
                    ? "border-gold-400 text-gold-200"
                    : "border-transparent text-mist-500 hover:text-mist-200",
                )}
              >
                {item.icon}
                {item.label}
                {item.id === "quiz" && data.quiz ? (
                  <span className="ml-1 h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                ) : null}
              </button>
            ))}
          </div>
        </div>
        <CardBody>
          {tab === "quiz" ? (
            <ControlQuizPanel
              data={data}
              selectedQuizId={selectedQuizId}
              onSelectQuiz={setSelectedQuizId}
              send={send}
              busy={busy}
              busyLabel={busyLabel}
            />
          ) : (
            <ControlLibrary
              tab={tab}
              data={data}
              selectedSceneId={selectedSceneId}
              onSelectScene={setSelectedOverride}
              onPublishScene={(id) => void publishScene(id)}
              busy={busy}
            />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
