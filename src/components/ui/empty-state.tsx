import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-10 text-center",
        className,
      )}
    >
      {icon ? <div className="text-gold-500/70">{icon}</div> : null}
      <div>
        <p className="font-display text-base text-mist-200">{title}</p>
        {description ? (
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-mist-500">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
