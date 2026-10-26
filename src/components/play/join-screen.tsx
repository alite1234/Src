"use client";

import { useState } from "react";
import { ArrowRight, KeyRound, Loader2, UserRound } from "lucide-react";

import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export function JoinScreen({
  initialPin,
  onJoined,
}: {
  initialPin: string;
  onJoined: () => Promise<void>;
}) {
  const [pin, setPin] = useState(initialPin.replace(/\D/g, "").slice(0, 6));
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (pin.length !== 6) {
      setError("Enter the six-digit game PIN.");
      return;
    }
    if (name.trim().length < 2) {
      setError("Enter the name you want on the leaderboard.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/play/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, name: name.trim() }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "You could not join. Try again.");
      }
      await onJoined();
    } catch (joinError) {
      setError(
        joinError instanceof Error
          ? joinError.message
          : "You could not join. Try again.",
      );
      setBusy(false);
    }
  };

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden px-5 py-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#0c2550_0%,#061127_48%,#030917_100%)]" />
        <div className="pattern-rays absolute inset-0 opacity-40" />
      </div>

      <div className="relative z-10 flex flex-1 flex-col">
        <Wordmark compact />

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-gold-400/80">
              Live quiz
            </p>
            <h1 className="mt-2 text-balance font-display text-4xl leading-[1.06] text-white">
              Join the room.
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-mist-400">
              Enter the game PIN shown on the projector, choose a name, and get
              ready to answer.
            </p>
          </div>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <Field label="Game PIN">
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-mist-600" />
                <Input
                  value={pin}
                  onChange={(event) =>
                    setPin(
                      event.target.value.replace(/\D/g, "").slice(0, 6),
                    )
                  }
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  className="h-14 pl-10 text-center font-display text-2xl tracking-[0.4em] text-white"
                  aria-label="Six-digit game PIN"
                  disabled={busy}
                  autoFocus={!initialPin}
                />
              </div>
            </Field>

            <Field label="Your name">
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-mist-600" />
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Name shown on the leaderboard"
                  maxLength={40}
                  autoComplete="name"
                  className="h-12 pl-10"
                  disabled={busy}
                  autoFocus={Boolean(initialPin)}
                />
              </div>
            </Field>

            {error ? (
              <div className="rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2.5 text-xs leading-relaxed text-red-100">
                {error}
              </div>
            ) : null}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={busy || pin.length !== 6 || name.trim().length < 2}
            >
              {busy ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <ArrowRight className="h-5 w-5" />
              )}
              Enter the quiz
            </Button>
          </form>

          <p className="mt-4 text-center text-[11px] leading-relaxed text-mist-600">
            No account needed. One answer per question. Your score is saved for
            this session only.
          </p>
        </div>

        <p className="text-center text-[10px] uppercase tracking-[0.22em] text-mist-600">
          SRC Legislative Summit
        </p>
      </div>
    </main>
  );
}
