import Link from "next/link";
import { ExternalLink, Radio, ShieldCheck, Download, Share2 } from "lucide-react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { Wordmark } from "@/components/brand/wordmark";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Controller",
  description: "Live control dashboard for the SRC Legislative Summit.",
  manifest: "/manifest.json",
  themeColor: "#d4af37",
  appleWebApp: {
    title: "SRC Controller",
    capable: true,
    statusBarStyle: "black-translucent",
  },
};

export default async function ControlLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser(["admin", "controller"]);

  const handleInstall = async () => {
    if (typeof window !== "undefined" && (window as any).BeforeInstallEvent) {
      const event = (window as any).BeforeInstallEvent;
      await event.prompt();
    }
  };

  return (
    <div className="min-h-dvh bg-navy-950">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#0a1d40_0%,#061127_46%,#030917_100%)]" />
        <div className="pattern-grid absolute inset-0 opacity-25" />
      </div>

      <div className="relative z-10 flex min-h-dvh flex-col">
        <header className="sticky top-0 z-30 border-b border-white/5 bg-navy-950/85 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-[1680px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2">
              <Link href="/control" className="min-w-0">
                <Wordmark compact />
              </Link>
              <Badge tone="gold" className="hidden sm:inline">
                <Radio className="h-3 w-3" />
                Controller
              </Badge>
              <Badge tone="gold" className="sm:hidden">
                <Radio className="h-3 w-3" />
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleInstall}
                title="Install controller app"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="sr-only">Install</span>
              </Button>
              <Link
                href="/control"
                target="_blank"
                className={buttonStyles({ variant: "ghost", size: "sm" })}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="sr-only">Open Projector</span>
              </Link>
              {user.role === "admin" ? (
                <Link
                  href="/admin"
                  className={buttonStyles({ variant: "ghost", size: "sm" })}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span className="sr-only">Admin</span>
                </Link>
              ) : null}
              <div className="hidden max-w-40 flex-col text-right sm:flex">
                <span className="truncate text-xs text-mist-300">
                  {user.name}
                </span>
                <span className="truncate text-[10px] text-mist-600">
                  {user.email}
                </span>
              </div>
              <SignOutButton compact />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1680px] flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
