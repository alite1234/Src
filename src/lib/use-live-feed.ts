"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type FeedStatus = "connecting" | "live" | "polling" | "offline";

type LiveFeedOptions = {
  url: string;
  sessionId?: string;
  pollMs?: number;
  enabled?: boolean;
};

type FeedData = {
  serverTime?: string;
};

export function useLiveFeed<T extends FeedData>({
  url,
  sessionId,
  pollMs = 2500,
  enabled = true,
}: LiveFeedOptions) {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<FeedStatus>("connecting");
  const [error, setError] = useState<string | null>(null);

  const offsetRef = useRef(0);
  const ablyConnectedRef = useRef(false);
  const mountedRef = useRef(true);

  const setFeedStatus = useCallback((next: FeedStatus) => {
    if (mountedRef.current) setStatus(next);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      const payload = (await response.json()) as T;
      if (!mountedRef.current) return;
      if (payload.serverTime) {
        offsetRef.current =
          new Date(payload.serverTime).getTime() - Date.now();
      }
      setData(payload);
      setError(null);
      setFeedStatus(ablyConnectedRef.current ? "live" : "polling");
    } catch {
      if (!mountedRef.current) return;
      setError("Connection interrupted. Reconnecting…");
      setFeedStatus(ablyConnectedRef.current ? "live" : "offline");
    }
  }, [url, setFeedStatus]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let ablyClient: { close: () => void } | null = null;

    const loop = async () => {
      await refresh();
      if (cancelled) return;
      const delay = ablyConnectedRef.current ? 15_000 : Math.min(pollMs, 500);
      timer = setTimeout(loop, delay);
    };

    void loop();

    const connectAbly = async () => {
      try {
        const tokenUrl = sessionId
          ? `/api/ably/token?sessionId=${encodeURIComponent(sessionId)}`
          : "/api/ably/token";
        const initial = await fetch(tokenUrl, { cache: "no-store" });
        if (!initial.ok) return;
        const bootstrap = (await initial.json()) as {
          tokenRequest: unknown;
          channels: string[];
        };
        if (!bootstrap.channels?.length || cancelled) return;

        const Ably = await import("ably");
        const client = new Ably.Realtime({
          authCallback: async (_params, callback) => {
            try {
              const response = await fetch(tokenUrl, { cache: "no-store" });
              if (!response.ok) throw new Error("Unable to authorise realtime");
              const latest = (await response.json()) as {
                tokenRequest: unknown;
              };
              callback(null, latest.tokenRequest as never);
            } catch (authError) {
              callback(
                authError instanceof Error
                  ? authError.message
                  : "Unable to authorise realtime",
                null,
              );
            }
          },
        });

        ablyClient = client;
        if (cancelled) {
          client.close();
          return;
        }

        client.connection.on((stateChange) => {
          const state = stateChange.current;
          if (state === "connected") {
            ablyConnectedRef.current = true;
            setFeedStatus("live");
            void refresh();
          } else if (
            state === "disconnected" ||
            state === "suspended" ||
            state === "failed"
          ) {
            ablyConnectedRef.current = false;
            setFeedStatus("polling");
          }
        });

        for (const channelName of bootstrap.channels) {
          const channel = client.channels.get(channelName);
          await channel.subscribe("refresh", () => {
            void refresh();
          });
        }
      } catch {
        ablyConnectedRef.current = false;
        setFeedStatus("polling");
      }
    };

    void connectAbly();

    return () => {
      cancelled = true;
      ablyConnectedRef.current = false;
      if (timer) clearTimeout(timer);
      ablyClient?.close();
    };
  }, [enabled, pollMs, refresh, sessionId, setFeedStatus]);

  const serverNow = useCallback(() => Date.now() + offsetRef.current, []);

  return { data, status, error, refresh, serverNow };
}
