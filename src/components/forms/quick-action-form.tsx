"use client";

import { useActionState } from "react";

import type { ActionState } from "@/lib/action-state";
import { cn } from "@/lib/utils";

export function QuickActionForm({
  action,
  children,
  className,
  errorClassName,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
  errorClassName?: string;
}) {
  const [state, formAction] = useActionState(action, {} as ActionState);

  return (
    <form action={formAction} className={cn("contents", className)}>
      {children}
      {state.error ? (
        <p
          role="alert"
          className={cn(
            "col-span-full rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-xs text-red-200",
            errorClassName,
          )}
        >
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
