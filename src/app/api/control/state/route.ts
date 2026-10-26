import { NextResponse } from "next/server";

import { getApiUser } from "@/lib/auth/guards";
import { buildControlPayload } from "@/lib/data/live";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getApiUser(["admin", "controller"]);
  if (!user) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }
  const payload = await buildControlPayload();
  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store" },
  });
}
