"use client";

import { useEffect } from "react";
import { WifiOff } from "lucide-react";

import { useLiveFeed } from "@/lib/use-live-feed";
import type { PublicLivePayload } from "@/lib/types";
import { ProjectionSurface } from "./projection-surface";

function ConnectionBadge({ offline }: { offline: boolean }) {
  if (!offline) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-amber-300/30 bg-black/60 px-3 py-1.5 text-[11px] text-amber-100 backdrop-blur">
      <WifiOff className="h-3.5 w-3.5" />
      Reconnecting…
    </div>
  );
}

export function ProjectorApp({
  initialData,
}: {
  initialData: PublicLivePayload;
}) {
  const { data: feed, status, serverNow } = useLiveFeed<PublicLivePayload>({
    url: "/api/public/live",
    pollMs: 2000,
  });
  const payload = feed ?? initialData;
  const { event } = payload;

  useEffect(() => {
    if (event) document.title = `${event.title} · Projector`;
  }, [event]);

  return (
    <div className="h-dvh w-full select-none overflow-hidden bg-black">
      <ProjectionSurface payload={payload} serverNow={serverNow} />
      <ConnectionBadge offline={status === "offline"} />
    </div>
  );
}
