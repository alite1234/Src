"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { ArrowRight, Loader2, LockKeyhole } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (!result || result.error) {
        setError("Those credentials were not recognised.");
        setPending(false);
        return;
      }

      router.replace("/home");
      router.refresh();
    } catch {
      setError("Sign in is unavailable right now. Please try again.");
      setPending(false);
    }
  }

  return (
    <div className="panel panel-glow rounded-2xl p-7 sm:p-9">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-gold-500/30 bg-gold-500/10 text-gold-300">
          <LockKeyhole className="h-4 w-4" />
        </span>
        <div>
          <h1 className="font-display text-2xl text-white">Sign in</h1>
          <p className="text-xs text-mist-500">
            Administrator and controller access
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-7 space-y-4">
        <Field label="Email address">
          <Input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@institution.edu"
          />
        </Field>
        <Field label="Password">
          <Input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••••"
          />
        </Field>

        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-xs text-red-200"
          >
            {error}
          </p>
        ) : null}

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in…
            </>
          ) : (
            <>
              Enter the platform
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-[11px] leading-relaxed text-mist-600">
        Accounts are provisioned by the summit administrator. Participants do
        not need an account — join with the game PIN.
      </p>
    </div>
  );
}
