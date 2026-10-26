"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  Eye,
  ListOrdered,
  MonitorPlay,
  Search,
  UsersRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/field";
import { SceneView } from "@/components/projector/scene-view";
import { SCENE_TYPES, SCENE_TYPE_MAP } from "@/lib/constants";
import type { ControlStatePayload, PublicScene } from "@/lib/types";
import { cn } from "@/lib/utils";

type LibraryTab = "scenes" | "speakers" | "queue";

function SceneCard({
  scene,
  data,
  selected,
  onSelect,
  onPublish,
  busy,
  badge,
}: {
  scene: PublicScene;
  data: ControlStatePayload;
  selected: boolean;
  onSelect: () => void;
  onPublish: () => void;
  busy: boolean;
  badge?: React.ReactNode;
}) {
  if (!data.event) return null;

  return (
    <div
      className={cn(
        "group overflow-hidden rounded-xl border bg-white/[0.02] transition-colors",
        selected
          ? "border-gold-400/60 ring-1 ring-gold-400/30"
          : "border-white/8 hover:border-gold-500/30",
      )}
    >
      <div className="aspect-video w-full overflow-hidden bg-navy-950">
        <SceneView
          scene={scene}
          event={data.event}
          logos={data.logos}
          scoreboard={data.scoreboard}
        />
      </div>
      <div className="space-y-2 p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone="gold">
            {SCENE_TYPE_MAP[scene.type]?.label ?? scene.type}
          </Badge>
          {badge}
        </div>
        <p className="truncate text-sm font-medium text-white">{scene.title}</p>
        <p className="truncate text-[10px] uppercase tracking-[0.14em] text-mist-600">
          {scene.speaker?.fullName ?? scene.animation}
        </p>
        <div className="flex items-center gap-1.5 pt-1">
          <Button
            type="button"
            variant={selected ? "secondary" : "subtle"}
            size="sm"
            className="flex-1"
            onClick={onSelect}
          >
            <Eye className="h-3.5 w-3.5" />
            Preview
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            className="flex-1"
            onClick={onPublish}
            disabled={busy}
          >
            <MonitorPlay className="h-3.5 w-3.5" />
            Display
          </Button>
        </div>
      </div>
    </div>
  );
}

function ScenesTab({
  data,
  selectedSceneId,
  onSelectScene,
  onPublishScene,
  busy,
}: {
  data: ControlStatePayload;
  selectedSceneId: string | null;
  onSelectScene: (id: string) => void;
  onPublishScene: (id: string) => void;
  busy: boolean;
}) {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.previewScenes.filter((scene) => {
      if (type !== "all" && scene.type !== type) return false;
      if (!query) return true;
      return [
        scene.title,
        scene.type,
        scene.speaker?.fullName ?? "",
        scene.content.body ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [data.previewScenes, search, type]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mist-600" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search scenes, speakers or text…"
            className="pl-9"
          />
        </div>
        <Select
          value={type}
          onChange={(event) => setType(event.target.value)}
          className="sm:w-56"
          aria-label="Filter by scene type"
        >
          <option value="all">All scene types</option>
          {SCENE_TYPES.filter((item) => item.creatable).map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<MonitorPlay className="h-5 w-5" />}
          title="No scenes match"
          description={
            data.previewScenes.length === 0
              ? "Create scenes in the admin dashboard to build the programme."
              : "Adjust the search or filter to find a scene."
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          {filtered.map((scene) => (
            <SceneCard
              key={scene.id}
              scene={scene}
              data={data}
              selected={selectedSceneId === scene.id}
              onSelect={() => onSelectScene(scene.id)}
              onPublish={() => onPublishScene(scene.id)}
              busy={busy}
              badge={
                data.live?.sceneId === scene.id ? (
                  <Badge tone="success">Live</Badge>
                ) : data.queue.some((item) => item.scene.id === scene.id) ? (
                  <Badge tone="neutral">Queued</Badge>
                ) : null
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SpeakersTab({
  data,
  selectedSceneId,
  onSelectScene,
  onPublishScene,
  busy,
}: {
  data: ControlStatePayload;
  selectedSceneId: string | null;
  onSelectScene: (id: string) => void;
  onPublishScene: (id: string) => void;
  busy: boolean;
}) {
  const [search, setSearch] = useState("");

  const speakers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return data.speakers;
    return data.speakers.filter((speaker) =>
      [
        speaker.fullName,
        speaker.title ?? "",
        speaker.institution ?? "",
        speaker.topic ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [data.speakers, search]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mist-600" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search speakers, roles, institutions or topics…"
          className="pl-9"
        />
      </div>

      {speakers.length === 0 ? (
        <EmptyState
          icon={<UsersRound className="h-5 w-5" />}
          title="No speakers found"
          description={
            data.speakers.length === 0
              ? "Add speakers in the admin dashboard to prepare introductions and citations."
              : "Try a different search term."
          }
        />
      ) : (
        <div className="space-y-2">
          {speakers.map((speaker) => {
            const scenes = data.previewScenes.filter(
              (scene) => scene.speaker?.id === speaker.id,
            );
            return (
              <div
                key={speaker.id}
                className="rounded-xl border border-white/8 bg-white/[0.02] p-3"
              >
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-navy-950">
                    {speaker.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={speaker.photoUrl}
                        alt={speaker.fullName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-display text-sm text-gold-300">
                        {speaker.fullName
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((part) => part[0])
                          .join("")}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      {speaker.fullName}
                    </p>
                    <p className="truncate text-xs text-mist-500">
                      {[speaker.title, speaker.institution]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {speaker.topic ? (
                      <p className="mt-1 truncate text-xs text-gold-200/80">
                        {speaker.topic}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-white/5 pt-2">
                  {scenes.length === 0 ? (
                    <p className="py-1 text-xs text-mist-600">
                      No scenes prepared for this speaker yet.
                    </p>
                  ) : (
                    scenes.map((scene) => (
                      <div
                        key={scene.id}
                        className={cn(
                          "flex items-center gap-1 rounded-lg border px-2 py-1 text-xs",
                          selectedSceneId === scene.id
                            ? "border-gold-400/40 bg-gold-500/10"
                            : "border-white/8 bg-white/[0.02]",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => onSelectScene(scene.id)}
                          className="flex items-center gap-1.5 text-mist-300 transition-colors hover:text-white"
                        >
                          <Eye className="h-3 w-3" />
                          <span className="max-w-40 truncate">
                            {SCENE_TYPE_MAP[scene.type]?.label ?? scene.title}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onPublishScene(scene.id)}
                          disabled={busy}
                          className="ml-1 rounded p-1 text-gold-300 transition-colors hover:bg-gold-500/15 disabled:opacity-40"
                          title="Display this scene"
                        >
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function QueueTab({
  data,
  selectedSceneId,
  onSelectScene,
  onPublishScene,
  busy,
}: {
  data: ControlStatePayload;
  selectedSceneId: string | null;
  onSelectScene: (id: string) => void;
  onPublishScene: (id: string) => void;
  busy: boolean;
}) {
  const currentIndex = data.queue.findIndex(
    (item) => item.scene.id === data.live?.sceneId,
  );

  if (data.queue.length === 0) {
    return (
      <EmptyState
        icon={<ListOrdered className="h-5 w-5" />}
        title="The queue is empty"
        description="Add scenes to the queue in the admin dashboard, or publish any scene manually from the library."
      />
    );
  }

  return (
    <div className="space-y-2">
      {data.queue.map((item, index) => {
        const live = data.live?.sceneId === item.scene.id;
        const next =
          currentIndex >= 0
            ? index === currentIndex + 1
            : index === 0;
        return (
          <div
            key={item.id}
            className={cn(
              "flex flex-wrap items-center gap-3 rounded-xl border px-3 py-2.5",
              live
                ? "border-emerald-400/35 bg-emerald-400/[0.05]"
                : selectedSceneId === item.scene.id
                  ? "border-gold-400/40 bg-gold-500/[0.05]"
                  : "border-white/8 bg-white/[0.02]",
            )}
          >
            <span className="w-6 shrink-0 text-center font-display text-sm text-gold-400">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="truncate text-sm text-white">
                  {item.scene.title}
                </p>
                {live ? <Badge tone="success">Live</Badge> : null}
                {next ? <Badge tone="gold">Next</Badge> : null}
              </div>
              <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-mist-600">
                {SCENE_TYPE_MAP[item.scene.type]?.label ?? item.scene.type}
                {item.scene.speaker
                  ? ` · ${item.scene.speaker.fullName}`
                  : ""}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="subtle"
                size="sm"
                onClick={() => onSelectScene(item.scene.id)}
              >
                <Eye className="h-3.5 w-3.5" />
                Preview
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => onPublishScene(item.scene.id)}
                disabled={busy}
              >
                Display
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ControlLibrary({
  tab,
  data,
  selectedSceneId,
  onSelectScene,
  onPublishScene,
  busy,
}: {
  tab: LibraryTab;
  data: ControlStatePayload;
  selectedSceneId: string | null;
  onSelectScene: (id: string) => void;
  onPublishScene: (id: string) => void;
  busy: boolean;
}) {
  if (tab === "speakers") {
    return (
      <SpeakersTab
        data={data}
        selectedSceneId={selectedSceneId}
        onSelectScene={onSelectScene}
        onPublishScene={onPublishScene}
        busy={busy}
      />
    );
  }
  if (tab === "queue") {
    return (
      <QueueTab
        data={data}
        selectedSceneId={selectedSceneId}
        onSelectScene={onSelectScene}
        onPublishScene={onPublishScene}
        busy={busy}
      />
    );
  }
  return (
    <ScenesTab
      data={data}
      selectedSceneId={selectedSceneId}
      onSelectScene={onSelectScene}
      onPublishScene={onPublishScene}
      busy={busy}
    />
  );
}

export type { LibraryTab };
