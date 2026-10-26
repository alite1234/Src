import { cn } from "@/lib/utils";

export function Wordmark({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold-500/50 bg-navy-900 text-[11px] font-bold tracking-[0.08em] text-gold-300 shadow-gold">
        SRC
      </span>
      <span className="leading-tight">
        <span className="block font-display text-sm tracking-[0.16em] text-white">
          LEGISLATIVE SUMMIT
        </span>
        {!compact ? (
          <span className="block text-[10px] uppercase tracking-[0.28em] text-gold-500/80">
            Projection &amp; Live Quiz
          </span>
        ) : null}
      </span>
    </div>
  );
}
