import { desc, eq } from "drizzle-orm";
import { ScrollText } from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { db } from "@/lib/db";
import { auditLogs, events, users } from "@/lib/db/schema";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Audit log" };

function actionLabel(action: string) {
  return action.replace(/[._]/g, " ");
}

function actionTone(action: string) {
  if (action.includes("deleted") || action.includes("removed")) return "danger";
  if (action.includes("created") || action.includes("added")) return "success";
  if (action.includes("publish") || action.includes("launch")) return "gold";
  return "neutral";
}

function detailsText(details: Record<string, unknown> | null) {
  if (!details) return "";
  const entries = Object.entries(details).filter(
    ([, value]) => value !== null && value !== undefined && value !== "",
  );
  if (entries.length === 0) return "";
  return entries
    .map(([key, value]) => {
      const rendered =
        typeof value === "object" ? JSON.stringify(value) : String(value);
      return `${key}: ${rendered}`;
    })
    .join("  ·  ");
}

export default async function AuditPage() {
  const rows = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      details: auditLogs.details,
      createdAt: auditLogs.createdAt,
      userName: users.name,
      userEmail: users.email,
      eventTitle: events.title,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .leftJoin(events, eq(auditLogs.eventId, events.id))
    .orderBy(desc(auditLogs.createdAt))
    .limit(250);

  return (
    <div>
      <PageHeader
        eyebrow="Oversight"
        title="Audit log"
        description="A chronological record of content changes, launches, reveals and account activity. The most recent 250 entries are shown."
        actions={<Badge tone="neutral">{rows.length} entries</Badge>}
      />

      <Card>
        <CardHeader
          title="Recent activity"
          description="Times are shown in your browser's local timezone."
        />
        <CardBody>
          {rows.length === 0 ? (
            <EmptyState
              icon={<ScrollText className="h-5 w-5" />}
              title="No activity yet"
              description="Actions will appear here as soon as you create a summit and start building content."
            />
          ) : (
            <ol className="relative space-y-1 border-l border-white/8 pl-4">
              {rows.map((row) => (
                <li key={row.id} className="relative py-2">
                  <span className="absolute -left-[21px] top-[15px] h-2 w-2 rounded-full border border-navy-950 bg-gold-500/80" />
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={actionTone(row.action) as "neutral" | "gold" | "success" | "danger"}>
                      {actionLabel(row.action)}
                    </Badge>
                    <span className="text-xs text-mist-500">
                      {formatDateTime(row.createdAt)}
                    </span>
                    <span className="text-xs text-mist-600">
                      · {row.userName ?? "System"}
                      {row.userEmail ? ` (${row.userEmail})` : ""}
                    </span>
                    {row.eventTitle ? (
                      <span className="text-xs text-mist-600">
                        · {row.eventTitle}
                      </span>
                    ) : null}
                  </div>
                  {row.details ? (
                    <p className="mt-1 break-words text-[11px] leading-relaxed text-mist-500">
                      {detailsText(row.details)}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
