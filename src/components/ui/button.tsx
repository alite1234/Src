import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "subtle";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-b from-gold-300 to-gold-500 text-navy-950 hover:from-gold-200 hover:to-gold-400 shadow-[0_10px_30px_-12px_rgba(212,175,55,0.65)]",
  secondary:
    "border border-gold-500/35 bg-navy-800/60 text-gold-200 hover:border-gold-400/60 hover:bg-navy-700/70",
  ghost:
    "border border-transparent text-mist-300 hover:border-gold-500/25 hover:bg-navy-800/60 hover:text-white",
  danger:
    "border border-red-400/30 bg-red-500/10 text-red-200 hover:border-red-400/60 hover:bg-red-500/20",
  subtle:
    "border border-white/10 bg-white/[0.04] text-mist-200 hover:border-gold-500/30 hover:bg-white/[0.07] hover:text-white",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-6 text-base gap-2.5 rounded-xl",
  icon: "h-9 w-9 rounded-lg",
};

export function buttonStyles({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cn(
    "inline-flex select-none items-center justify-center font-medium tracking-wide transition-all duration-200 disabled:pointer-events-none disabled:opacity-40 active:translate-y-px",
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      className={buttonStyles({ variant, size, className })}
      {...props}
    />
  );
}
