import Link from "next/link";
import { ExternalLink, Radio } from "lucide-react";

import { AdminNav } from "@/components/admin/admin-nav";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Wordmark } from "@/components/brand/wordmark";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { getActiveEvent } from "@/lib/data/events";
import { requireUser } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin" };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser(["admin"]);
  const event = await getActiveEvent();

  return (
    <div className="min-h-dvh bg-navy-950">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,#0a1d40_0%,#061127_46%,#030917_100%)]" />
        <div className="pattern-grid absolute inset-0 opacity-30" />
      </div>

      <div className="relative z-10 flex min-h-dvh">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-white/5 bg-navy-950/60 p-4 backdrop-blur-xl lg:flex">
          <Link href="/admin" className="px-2 py-3">
            <Wordmark compact />
          </Link>

          <div className="mt-4 rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-mist-600">
              Active summit
            </p>
            <p className="mt-1 truncate text-sm text-white">
              {event?.title ?? "No summit yet"}
            </p>
            {event ? (
              <Badge
                tone={event.status === "live" ? "gold" : "neutral"}
                className="mt-2"
              >
                {event.status}
              </Badge>
            ) : null}
          </div>

          <div className="mt-6 flex-1">
            <AdminNav />
          </div>

          <div className="space-y-2 border-t border-white/5 pt-4">
            <Link
              href="/control"
              className={buttonStyles({
                variant: "secondary",
                size: "sm",
                className: "w-full justify-start",
              })}
            >
              <Radio className="h-3.5 w-3.5" />
              Controller dashboard
            </Link>
            <Link
              href="/project"
              target="_blank"
              className={buttonStyles({
                variant: "ghost",
                size: "sm",
                className: "w-full justify-start",
              })}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open projector
            </Link>
            <div className="pt-2">
              <p className="truncate px-2 text-xs text-mist-300">{user.name}</p>
              <p className="truncate px-2 text-[10px] text-mist-600">
                {user.email}
              </p>
              <SignOutButton />
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-white/5 bg-navy-950/80 px-4 py-3 backdrop-blur-xl lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <Wordmark compact />
              <div className="flex items-center gap-1">
                <Link
                  href="/project"
                  target="_blank"
                  className={buttonStyles({ variant: "ghost", size: "icon" })}
                  title="Open projector"
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
                <SignOutButton compact />
              </div>
            </div>
            <div className="mt-3">
              <AdminNav compact />
            </div>
          </header>

          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
