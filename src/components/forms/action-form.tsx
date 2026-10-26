"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Check, Loader2 } from "lucide-react";

import type { ActionState } from "@/lib/action-state";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type FormAction = (
  state: ActionState,
  formData: FormData,
) => Promise<ActionState>;

function SubmitButton({
  label,
  pendingLabel,
  variant = "primary",
  size = "md",
  className,
}: {
  label: string;
  pendingLabel?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      className={className}
      disabled={pending}
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {pendingLabel ?? "Saving…"}
        </>
      ) : (
        label
      )}
    </Button>
  );
}

export function ActionForm({
  action,
  children,
  submitLabel,
  pendingLabel,
  className,
  submitClassName,
  variant = "primary",
  size = "md",
  footer,
  hideSubmit = false,
}: {
  action: FormAction;
  children: React.ReactNode;
  submitLabel: string;
  pendingLabel?: string;
  className?: string;
  submitClassName?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  footer?: React.ReactNode;
  hideSubmit?: boolean;
}) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className={cn("space-y-4", className)}>
      {children}

      {state.error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-xs text-red-200"
        >
          {state.error}
        </p>
      ) : null}

      {state.ok && state.message ? (
        <p className="flex items-center gap-2 rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
          <Check className="h-3.5 w-3.5" />
          {state.message}
        </p>
      ) : null}

      {footer ? (
        <div className="border-t border-white/5 pt-4">{footer}</div>
      ) : null}

      {hideSubmit ? null : (
        <div className="flex justify-end pt-1">
          <SubmitButton
            label={submitLabel}
            pendingLabel={pendingLabel}
            variant={variant}
            size={size}
            className={submitClassName}
          />
        </div>
      )}
    </form>
  );
}
