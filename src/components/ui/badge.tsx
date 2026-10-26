import { cn } from "@/lib/utils";

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "gold" | "success" | "danger" | "info";
  className?: string;
}) {
  const tones = {
    neutral: "border-white/10 bg-white/5 text-mist-300",
    gold: "border-gold-500/30 bg-gold-500/10 text-gold-200",
    success: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
    danger: "border-red-400/30 bg-red-400/10 text-red-200",
    info: "border-sky-400/30 bg-sky-400/10 text-sky-200",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
