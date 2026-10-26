"use client";

import { useState } from "react";

import type { PlayStatePayload } from "@/lib/types";
import { JoinScreen } from "./join-screen";
import { PlayGame } from "./play-game";

export function PlayApp({
  initialData,
  initialPin,
}: {
  initialData: PlayStatePayload | null;
  initialPin: string;
}) {
  const [data, setData] = useState<PlayStatePayload | null>(initialData);

  if (!data) {
    return (
      <JoinScreen
        initialPin={initialPin}
        onJoined={async () => {
          try {
            const response = await fetch("/api/play/state", {
              cache: "no-store",
            });
            if (!response.ok) throw new Error("Unable to load the quiz.");
            const payload = (await response.json()) as PlayStatePayload;
            setData(payload);
          } catch {
            window.location.reload();
          }
        }}
      />
    );
  }

  return <PlayGame initialData={data} onLeave={() => setData(null)} />;
}
