import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { Wordmark } from "@/components/brand/wordmark";
import { getSessionUser } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect("/home");

  return (
    <main className="relative flex min-h-dvh items-stretch overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,#0c2550_0%,#061127_45%,#030917_80%)]" />
        <div className="pattern-rays absolute inset-0 opacity-50" />
      </div>

      <div className="relative z-10 hidden w-1/2 flex-col justify-between border-r border-white/5 p-12 lg:flex">
        <Wordmark />
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.36em] text-gold-500/80">
            The control room
          </p>
          <h1 className="mt-5 max-w-lg text-balance font-display text-5xl leading-[1.08] text-white">
            Prepare the content. Command the room.
          </h1>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-mist-400">
            Administrators build the summit. Controllers decide what the
            audience sees, and when. Everything stays in sync — from the
            speaker citation to the final leaderboard.
          </p>
          <div className="mt-10 grid max-w-md grid-cols-3 gap-3 text-center">
            {[
              ["01", "Configure"],
              ["02", "Project"],
              ["03", "Compete"],
            ].map(([step, label]) => (
              <div
                key={step}
                className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-4"
              >
                <p className="font-display text-xl text-gold-400">{step}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-mist-500">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-[11px] uppercase tracking-[0.22em] text-mist-600">
          SRC Legislative Summit Platform
        </p>
      </div>

      <div className="relative z-10 flex w-full flex-1 items-center justify-center p-6 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Wordmark />
          </div>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
