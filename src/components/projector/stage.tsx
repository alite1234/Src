import type { CSSProperties } from "react";

import { THEMES } from "@/lib/constants";
import type {
  LogoVisibility,
  PublicEvent,
  PublicLogo,
  SceneLogoOverride,
  SceneType,
  VisibilityKey,
} from "@/lib/types";
import {
  visibleForKey,
} from "@/lib/logo-visibility";
import { cn } from "@/lib/utils";
import { CornerLogos, LogoStrip } from "./logo-strip";

type StageProps = {
  event: PublicEvent | null;
  logos: PublicLogo[];
  layout?: PublicEvent["logoLayout"];
  showLogos: boolean;
  children: React.ReactNode;
  className?: string;
  pattern?: string;
  contain?: boolean;
};

export function stageTheme(event: PublicEvent | null) {
  const theme = THEMES[event?.theme ?? "navy-gold"];
  return theme;
}

export function stageStyle(event: PublicEvent | null): CSSProperties {
  const theme = stageTheme(event);
  return {
    "--stage-bg": theme.vars.bg,
    "--stage-bg-2": theme.vars.bg2,
    "--stage-surface": theme.vars.surface,
    "--stage-accent": theme.vars.accent,
    "--stage-accent-2": theme.vars.accent2,
    "--stage-text": theme.vars.text,
    "--stage-muted": theme.vars.muted,
    containerType: "size",
  } as CSSProperties;
}

const patternClass = {
  rays: "pattern-rays",
  grid: "pattern-grid",
  orb: "pattern-orb",
  lines: "pattern-lines",
} as const;

export function Stage({
  event,
  logos,
  layout,
  showLogos,
  children,
  className,
  contain = true,
}: StageProps) {
  const theme = stageTheme(event);
  const resolvedLayout = layout ?? event?.logoLayout ?? "primary";
  const corner = showLogos && resolvedLayout === "corners";
  const footer = showLogos && resolvedLayout === "footer";
  const headerLogo = showLogos && !corner && !footer;

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden bg-[var(--stage-bg)] text-[var(--stage-text)]",
        contain && "contain-[size]",
        className,
      )}
      style={stageStyle(event)}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 50% -12%, ${theme.vars.bg2} 0%, ${theme.vars.bg} 64%)`,
        }}
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-0 opacity-55",
          patternClass[theme.pattern],
        )}
      />
      <div
        className="absolute inset-x-0 top-0 z-10 h-[0.22cqh]"
        style={{
          background: `linear-gradient(90deg, transparent, ${theme.vars.accent}, transparent)`,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 115%, rgba(0,0,0,0.5) 0%, transparent 60%)",
        }}
      />

      {corner ? <CornerLogos logos={logos} /> : null}

      <div className="relative z-10 flex h-full flex-col px-[5.5cqw] pb-[4.5cqh] pt-[4.2cqh]">
        {headerLogo ? (
          <div className="mb-[2.6cqh] shrink-0">
            <LogoStrip logos={logos} layout={resolvedLayout} />
          </div>
        ) : null}

        <div className="relative min-h-0 flex-1">{children}</div>

        {footer ? (
          <div className="mt-[2.4cqh] shrink-0">
            <LogoStrip logos={logos} layout="footer" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function resolveStageLogos(input: {
  event: PublicEvent | null;
  logos: PublicLogo[];
  visibility?: LogoVisibility | null;
  override?: SceneLogoOverride | null;
  key: VisibilityKey;
  show?: boolean;
}) {
  if (input.show === false) return false;
  if (input.override?.mode === "show") return true;
  if (input.override?.mode === "hide") return false;
  const visibility = input.visibility ?? input.event?.logoVisibility;
  return visibleForKey(visibility, input.key);
}

export function stageVisibilityKey(type: SceneType): VisibilityKey {
  if (type === "opening") return "opening";
  if (type === "welcome") return "welcome";
  if (type === "speaker_intro" || type === "speaking_now") return "speaker";
  if (type === "citation") return "citation";
  if (type === "scoreboard") return "scoreboard";
  if (type === "fixtures") return "fixtures";
  if (type === "countdown") return "countdown";
  if (type === "break") return "break";
  if (type === "closing") return "closing";
  if (type === "quiz_question" || type === "answer_reveal" || type === "quiz_intro")
    return "quiz";
  return "announcement";
}
