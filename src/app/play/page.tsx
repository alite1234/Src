import { cookies } from "next/headers";

import { PlayApp } from "@/components/play/play-app";
import { getParticipantFromToken } from "@/lib/data/quiz";
import { buildPlayState } from "@/lib/data/live";
import {
  PLAY_COOKIE,
  verifyParticipantToken,
} from "@/lib/participant-token";
import type { PlayStatePayload } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = { title: "Join the quiz" };

export default async function PlayPage({
  searchParams,
}: {
  searchParams: Promise<{ pin?: string }>;
}) {
  const { pin } = await searchParams;
  const cookieStore = await cookies();
  const token = await verifyParticipantToken(
    cookieStore.get(PLAY_COOKIE)?.value,
  );

  let initialData: PlayStatePayload | null = null;
  if (token) {
    const participant = await getParticipantFromToken(
      token.participantId,
      token.sessionId,
    );
    if (participant) {
      initialData = await buildPlayState(participant);
    }
  }

  return (
    <PlayApp
      initialData={initialData}
      initialPin={(pin ?? "").replace(/\D/g, "").slice(0, 6)}
    />
  );
}
