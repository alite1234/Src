"use client";

import { motion } from "framer-motion";

import type { PublicScoreboard } from "@/lib/types";
import { formatScore, ordinal } from "@/lib/utils";
import { CountUp } from "./count-up";

function Podium({
  scoreboard,
}: {
  scoreboard: PublicScoreboard;
}) {
  const [first, second, third] = scoreboard.entries;
  const cards = [
    {
      entry: second,
      place: 2,
      height: "h-[24cqh]",
      order: "order-1",
      tone: "border-white/15 bg-white/[0.05]",
    },
    {
      entry: first,
      place: 1,
      height: "h-[32cqh]",
      order: "order-2",
      tone: "border-[var(--stage-accent)]/60 bg-[var(--stage-accent)]/10",
    },
    {
      entry: third,
      place: 3,
      height: "h-[19cqh]",
      order: "order-3",
      tone: "border-white/15 bg-white/[0.04]",
    },
  ];

  return (
    <div className="flex h-full items-end justify-center gap-[2.4cqw] pb-[1cqh]">
      {cards.map((card, index) =>
        card.entry ? (
          <motion.div
            key={card.entry.id}
            initial={{ opacity: 0, y: "8%" }}
            animate={{ opacity: 1, y: "0%" }}
            transition={{ duration: 0.55, delay: index * 0.1 }}
            className={`${card.order} ${card.height} ${card.tone} flex w-[26cqw] flex-col items-center justify-center rounded-t-2xl border px-[1.4cqw] pt-[1.8cqh]`}
          >
            <p className="font-display text-[2.4cqw] text-[var(--stage-accent)]">
              {ordinal(card.place)}
            </p>
            <p className="mt-[0.8cqh] line-clamp-2 text-center text-[1.7cqw] font-semibold tracking-wide">
              {card.entry.name}
            </p>
            <p className="mt-[0.6cqh] text-[2.1cqw] font-bold text-[var(--stage-accent-2)]">
              <CountUp value={card.entry.score} />
            </p>
          </motion.div>
        ) : (
          <div
            key={`placeholder-${card.place}`}
            className={`${card.order} h-[10cqh] w-[26cqw] rounded-t-2xl border border-dashed border-white/10 bg-white/[0.02]`}
          />
        ),
      )}
    </div>
  );
}

export function LeaderboardView({
  scoreboard,
}: {
  scoreboard: PublicScoreboard;
}) {
  const shown = scoreboard.entries.slice(0, 12);

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 text-center">
        <p className="text-[1.15cqw] font-semibold uppercase tracking-[0.42em] text-[var(--stage-accent)]">
          {scoreboard.mode === "team" ? "Team standings" : "Individual standings"}
        </p>
        <h2 className="mt-[1.2cqh] font-display text-[4.4cqw] leading-none">
          {scoreboard.title}
        </h2>
        {scoreboard.description ? (
          <p className="mt-[1cqh] text-[1.35cqw] text-[var(--stage-muted)]">
            {scoreboard.description}
          </p>
        ) : null}
        <div className="gold-rule mx-auto mt-[1.6cqh] w-[28cqw]" />
      </div>

      <div className="mt-[2.4cqh] min-h-0 flex-1">
        {scoreboard.entries.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="font-display text-[2.6cqw] text-[var(--stage-muted)]">
              {scoreboard.totalEntries === 0
                ? "Results will appear here."
                : "The results are about to be revealed…"}
            </p>
          </div>
        ) : scoreboard.displayMode === "podium" ? (
          <Podium scoreboard={scoreboard} />
        ) : (
          <ol className="mx-auto flex max-w-[78cqw] flex-col gap-[1cqh]">
            {shown.map((entry, index) => (
              <motion.li
                key={entry.id}
                initial={{ opacity: 0, x: "-3%" }}
                animate={{ opacity: 1, x: "0%" }}
                transition={{ duration: 0.45, delay: index * 0.07 }}
                className={`flex items-center gap-[1.6cqw] rounded-xl border px-[1.8cqw] py-[1.25cqh] ${
                  index === 0
                    ? "border-[var(--stage-accent)]/50 bg-[var(--stage-accent)]/10"
                    : "border-white/10 bg-white/[0.035]"
                }`}
              >
                <span className="w-[4.4cqw] font-display text-[2.5cqw] text-[var(--stage-accent)]">
                  {ordinal(index + 1)}
                </span>
                <span className="min-w-0 flex-1 truncate text-[2.05cqw] font-medium tracking-wide">
                  {entry.name}
                </span>
                <span className="font-display text-[2.3cqw] text-[var(--stage-accent-2)]">
                  <CountUp value={entry.score} />
                  <span className="ml-[0.5cqw] text-[1.1cqw] uppercase tracking-[0.16em] text-[var(--stage-muted)]">
                    pts
                  </span>
                </span>
              </motion.li>
            ))}
          </ol>
        )}
      </div>

      {scoreboard.totalEntries > shown.length &&
      scoreboard.displayMode !== "podium" ? (
        <p className="mt-[1.2cqh] shrink-0 text-center text-[1.05cqw] uppercase tracking-[0.24em] text-[var(--stage-muted)]">
          {scoreboard.totalEntries - shown.length} more on the full board ·{" "}
          {formatScore(scoreboard.totalEntries)} entries
        </p>
      ) : null}
    </div>
  );
}
