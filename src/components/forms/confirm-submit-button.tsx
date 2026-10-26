"use client";

import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";

export function ConfirmSubmitButton({
  children,
  message,
  variant = "danger",
  size = "sm",
  className,
  title,
}: {
  children: React.ReactNode;
  message: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  title?: string;
}) {
  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      className={className}
      title={title}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {children}
    </Button>
  );
}
