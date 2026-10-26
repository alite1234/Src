"use client";

import { useEffect, useState } from "react";

export function useCountdown({
  endsAt,
  pausedRemainingMs,
  running = true,
  serverNow,
  intervalMs = 250,
}: {
  endsAt: string | null | undefined;
  pausedRemainingMs?: number | null;
  running?: boolean;
  serverNow?: () => number;
  intervalMs?: number;
}) {
  const compute = () => {
    if (!running) return Math.max(0, pausedRemainingMs ?? 0);
    if (!endsAt) return 0;
    const now = serverNow ? serverNow() : Date.now();
    return Math.max(0, new Date(endsAt).getTime() - now);
  };

  const [remaining, setRemaining] = useState(compute);

  useEffect(() => {
    const update = () => {
      if (!running) {
        setRemaining(Math.max(0, pausedRemainingMs ?? 0));
        return;
      }
      if (!endsAt) {
        setRemaining(0);
        return;
      }
      const now = serverNow ? serverNow() : Date.now();
      setRemaining(Math.max(0, new Date(endsAt).getTime() - now));
    };
    const timer = setInterval(update, intervalMs);
    return () => clearInterval(timer);
  }, [endsAt, intervalMs, pausedRemainingMs, running, serverNow]);

  return running ? remaining : Math.max(0, pausedRemainingMs ?? 0);
}
