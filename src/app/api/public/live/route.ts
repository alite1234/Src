import { NextResponse } from "next/server";

import { buildPublicLivePayload } from "@/lib/data/live";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const payload = await buildPublicLivePayload();
  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store" },
  });
}
