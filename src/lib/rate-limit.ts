import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { rateLimits } from "@/lib/db/schema";

export function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
) {
  const now = new Date();
  const cutoff = new Date(now.getTime() - windowSeconds * 1000);

  try {
    const rows = await db
      .insert(rateLimits)
      .values({ key, count: 1, windowStart: now })
      .onConflictDoUpdate({
        target: rateLimits.key,
        set: {
          count: sql`case when ${rateLimits.windowStart} < ${cutoff} then 1 else ${rateLimits.count} + 1 end`,
          windowStart: sql`case when ${rateLimits.windowStart} < ${cutoff} then ${now} else ${rateLimits.windowStart} end`,
        },
      })
      .returning({ count: rateLimits.count });

    const count = rows[0]?.count ?? 1;
    return { ok: count <= limit, count };
  } catch (error) {
    console.error("Rate limit check failed", error);
    return { ok: true, count: 0 };
  }
}
