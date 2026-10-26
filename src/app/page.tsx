import Link from "next/link";
import {
  ArrowRight,
  LayoutDashboard,
  MonitorPlay,
  Radio,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trophy,
} from "lucide-react";

import { Wordmark } from "@/components/brand/wordmark";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#0d2a5b_0%,#061127_42%,#030917_78%)]" />
        <div className="pattern-rays absolute inset-0 opacity-60" />
        <div className="absolute -left-40 top-1/3 h-96 w-96 rounded-full bg-gold-500/5 blur-[120px]" />
        <div className="absolute -right-40 top-10 h-[28rem] w-[28rem] rounded-full bg-sky-500/5 blur-[140px]" />
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Wordmark />
        <nav className="flex items-center gap-2">
          <Link
            href="/play"
            className={buttonStyles({ variant: "ghost", size: "sm" })}
          >
            Join quiz
          </Link>
          <Link
            href="/project"
            className={buttonStyles({ variant: "ghost", size: "sm" })}
          >
            Projector
          </Link>
          <Link
            href="/login"
            className={buttonStyles({ variant: "secondary", size: "sm" })}
          >
            Sign in
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </nav>
      </header>

      <section className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-6 pb-20 pt-8 text-center">
        <Badge tone="gold" className="mb-7">
          <Sparkles className="h-3 w-3" />
          Student Representative Council
        </Badge>

        <h1 className="max-w-4xl text-balance font-display text-5xl leading-[1.04] tracking-tight text-white sm:text-6xl lg:text-7xl">
          A stage worthy of
          <span className="text-gradient-gold"> the debate.</span>
        </h1>

        <p className="mt-6 max-w-2xl text-balance text-base leading-relaxed text-mist-400 sm:text-lg">
          One unified command centre for the SRC Legislative Summit:
          projection, speaker citations, scoreboards and a live Kahoot-style
          quiz — synchronised in real time.
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/login"
            className={buttonStyles({ variant: "primary", size: "lg" })}
          >
            Enter the control room
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/play"
            className={buttonStyles({ variant: "secondary", size: "lg" })}
          >
            <Smartphone className="h-4 w-4" />
            Join the quiz
          </Link>
        </div>

        <div className="mt-16 grid w-full max-w-5xl gap-3 text-left sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: LayoutDashboard,
              title: "Admin",
              copy: "Branding, speakers, scenes, quiz bank and scoreboards.",
            },
            {
              icon: Radio,
              title: "Controller",
              copy: "Preview privately, publish instantly, run the live show.",
            },
            {
              icon: MonitorPlay,
              title: "Projection",
              copy: "Full-screen 16:9 graphics with cinematic transitions.",
            },
            {
              icon: Trophy,
              title: "Participants",
              copy: "Join by PIN or QR and compete on any phone.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="group panel relative overflow-hidden rounded-2xl p-5 transition-colors hover:border-gold-500/30"
            >
              <item.icon className="h-5 w-5 text-gold-400" />
              <p className="mt-4 font-display text-lg text-white">
                {item.title}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-mist-500">
                {item.copy}
              </p>
              <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold-500/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] uppercase tracking-[0.18em] text-mist-600">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-gold-500/70" />
            Role-based access
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Radio className="h-3.5 w-3.5 text-gold-500/70" />
            Realtime sync
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5 text-gold-500/70" />
            Server-authoritative scoring
          </span>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/5 px-6 py-5">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 text-xs text-mist-600">
          <span>SRC Legislative Summit · Projection &amp; Interactive Quiz</span>
          <span className="tracking-[0.2em] uppercase">
            Prepared for the chamber
          </span>
        </div>
      </footer>
    </main>
  );
}
