import Ably from "ably";

const CHANNEL_PREFIX = "src-summit";

let restClient: Ably.Rest | null = null;

export function ablyKey() {
  const key = process.env.ABLY_API_KEY;
  if (!key || key.toLowerCase().includes("placeholder")) return null;
  return key;
}

export function hasAbly() {
  return ablyKey() !== null;
}

function client() {
  const key = ablyKey();
  if (!key) return null;
  if (!restClient) {
    restClient = new Ably.Rest({ key });
  }
  return restClient;
}

export function eventChannel(eventId: string) {
  return `${CHANNEL_PREFIX}:event:${eventId}`;
}

export function sessionChannel(sessionId: string) {
  return `${CHANNEL_PREFIX}:session:${sessionId}`;
}

async function publish(channel: string) {
  const ably = client();
  if (!ably) return;
  try {
    await ably.channels.get(channel).publish("refresh", { at: Date.now() });
  } catch (error) {
    console.error(`Ably publish failed on ${channel}`, error);
  }
}

export async function publishEventUpdate(eventId: string) {
  await publish(eventChannel(eventId));
}

export async function publishSessionUpdate(
  eventId: string,
  sessionId: string,
) {
  await Promise.all([
    publish(sessionChannel(sessionId)),
    publish(eventChannel(eventId)),
  ]);
}

export async function createRealtimeToken(
  channels: string[],
  clientId: string,
) {
  const ably = client();
  if (!ably) return null;
  const capability: Record<string, ["subscribe"]> = {};
  for (const channel of channels) {
    capability[channel] = ["subscribe"];
  }
  return ably.auth.createTokenRequest({
    capability,
    clientId,
    ttl: 60 * 60 * 1000,
  });
}
