"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AudioLines,
  CalendarRange,
  ClipboardList,
  Image as ImageIcon,
  LayoutDashboard,
  ListOrdered,
  ScrollText,
  Trophy,
  UsersRound,
} from "lucide-react";

import { cn } from "@/lib/utils";

const links = [
  { href: "/admin", label: "Summit", icon: LayoutDashboard },
  { href: "/admin/branding", label: "Branding", icon: ImageIcon },
  { href: "/admin/speakers", label: "Speakers", icon: UsersRound },
  { href: "/admin/scenes", label: "Scenes", icon: ListOrdered },
  { href: "/admin/scoreboard", label: "Scoreboard", icon: Trophy },
  { href: "/admin/fixtures", label: "Fixtures", icon: CalendarRange },
  { href: "/admin/quiz", label: "Quiz", icon: ClipboardList },
  { href: "/admin/users", label: "Users", icon: AudioLines },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText },
];

export function AdminNav({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();

  if (compact) {
    return (
      <nav className="no-scrollbar flex gap-1 overflow-x-auto">
        {links.map((link) => {
          const active =
            link.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors",
                active
                  ? "bg-gold-500/15 text-gold-200"
                  : "text-mist-400 hover:bg-white/5 hover:text-white",
              )}
            >
              <link.icon className="h-3.5 w-3.5" />
              {link.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="space-y-1">
      {links.map((link) => {
        const active =
          link.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
              active
                ? "bg-gold-500/12 text-gold-200"
                : "text-mist-400 hover:bg-white/[0.04] hover:text-white",
            )}
          >
            <link.icon
              className={cn(
                "h-4 w-4",
                active
                  ? "text-gold-400"
                  : "text-mist-500 group-hover:text-mist-300",
              )}
            />
            {link.label}
            {active ? (
              <span className="ml-auto h-1 w-1 rounded-full bg-gold-400" />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
