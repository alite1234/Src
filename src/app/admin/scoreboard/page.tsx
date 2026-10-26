import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Trash2,
  Trophy,
} from "lucide-react";

import {
  addTeamAction,
  createScoreboardAction,
  deleteTeamAction,
  moveTeamAction,
  updateScoreboardAction,
  updateTeamAction,
} from "@/app/admin/scoreboard/actions";
import { AdminNotice, PageHeader } from "@/components/admin/page-header";
import { ActionForm } from "@/components/forms/action-form";
import { ConfirmSubmitButton } from "@/components/forms/confirm-submit-button";
import { LeaderboardView } from "@/components/projector/leaderboard-view";
import { Stage } from "@/components/projector/stage";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import {
  ANIMATION_PRESETS,
  SCOREBOARD_DISPLAY_MODES,
} from "@/lib/constants";
import { db } from "@/lib/db";
import { teams } from "@/lib/db/schema";
import {
  getActiveEvent,
  getEventLogos,
  getEventScoreboard,
  toPublicEvent,
} from "@/lib/data/events";
import { formatScore } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Scoreboard" };

function ScoreboardFields({
  board,
}: {
  board?: {
    title: string;
    description: string | null;
    mode: "individual" | "team";
    displayMode: string;
    tieBreaker: string;
    animation: string;
  };
}) {
  return (
    <>
      <Field label="Scoreboard title">
        <Input
          name="title"
          required
          defaultValue={board?.title ?? "Summit standings"}
          placeholder="Summit standings"
        />
      </Field>
      <Field label="Description">
        <Textarea
          name="description"
          defaultValue={board?.description ?? ""}
          placeholder="Optional line shown beneath the title."
          className="min-h-16"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Entry type">
          <Select name="mode" defaultValue={board?.mode ?? "team"}>
            <option value="team">Teams</option>
            <option value="individual">Individuals</option>
          </Select>
        </Field>
        <Field label="Display mode">
          <Select
            name="displayMode"
            defaultValue={board?.displayMode ?? "sequential"}
          >
            {SCOREBOARD_DISPLAY_MODES.map((mode) => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tie breaker">
          <Select name="tieBreaker" defaultValue={board?.tieBreaker ?? "name"}>
            <option value="name">Alphabetical</option>
            <option value="order">Display order</option>
          </Select>
        </Field>
        <Field label="Animation">
          <Select name="animation" defaultValue={board?.animation ?? "reveal"}>
            {ANIMATION_PRESETS.map((preset) => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </>
  );
}

export default async function ScoreboardPage() {
  const event = await getActiveEvent();
  if (!event) {
    return (
      <div>
        <PageHeader title="Scoreboard" eyebrow="Results" />
        <EmptyState
          icon={<Trophy className="h-6 w-6" />}
          title="No active summit"
          description="Activate a summit before building a scoreboard."
          action={
            <Link
              href="/admin"
              className={buttonStyles({ variant: "secondary", size: "sm" })}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to summit
            </Link>
          }
        />
      </div>
    );
  }

  const [board, logos] = await Promise.all([
    getEventScoreboard(event.id),
    getEventLogos(event.id),
  ]);
  const publicEvent = toPublicEvent(event);
  const entries = board
    ? await db
        .select()
        .from(teams)
        .where(eq(teams.scoreboardId, board.id))
        .orderBy(asc(teams.displayOrder), asc(teams.name))
    : [];

  return (
    <div>
      <PageHeader
        eyebrow="Results"
        title="Scoreboard"
        description="Manage standings manually, then reveal them one by one or all at once from the controller. A scoreboard scene must be published for the audience to see it."
        actions={<Badge tone="gold">{entries.length} entries</Badge>}
      />

      <AdminNotice />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          {!board ? (
            <Card>
              <CardHeader
                title="Create a scoreboard"
                description="One scoreboard is available per summit."
              />
              <CardBody>
                <ActionForm
                  action={createScoreboardAction}
                  submitLabel="Create scoreboard"
                >
                  <ScoreboardFields />
                </ActionForm>
              </CardBody>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader
                  title="Scoreboard settings"
                  description="Display mode controls how the projector presents the reveal."
                />
                <CardBody>
                  <ActionForm
                    action={updateScoreboardAction}
                    submitLabel="Save settings"
                  >
                    <ScoreboardFields
                      board={{
                        title: board.title,
                        description: board.description,
                        mode: board.mode,
                        displayMode: board.displayMode,
                        tieBreaker: board.tieBreaker,
                        animation: board.animation,
                      }}
                    />
                  </ActionForm>
                </CardBody>
              </Card>

              <Card>
                <CardHeader
                  title="Entries"
                  description="Scores are whole numbers. Use the arrows to control the intended display order for ties."
                  actions={
                    <Badge tone="neutral">
                      {entries.length} {board.mode === "team" ? "teams" : "people"}
                    </Badge>
                  }
                />
                <CardBody className="space-y-4">
                  <ActionForm
                    action={addTeamAction}
                    submitLabel="Add entry"
                    variant="secondary"
                    size="sm"
                    className="rounded-xl border border-gold-500/20 bg-gold-500/[0.04] p-3"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                      <div className="flex-1">
                        <Field label="New entry name">
                          <Input
                            name="name"
                            required
                            placeholder={
                              board.mode === "team" ? "Team name" : "Participant"
                            }
                            className="h-9"
                          />
                        </Field>
                      </div>
                      <div className="w-28">
                        <Field label="Score">
                          <Input
                            type="number"
                            name="score"
                            defaultValue={0}
                            className="h-9"
                          />
                        </Field>
                      </div>
                    </div>
                  </ActionForm>

                  {entries.length === 0 ? (
                    <EmptyState
                      icon={<Trophy className="h-5 w-5" />}
                      title="No entries yet"
                      description="Add teams or individuals above, then reveal the standings from the controller."
                    />
                  ) : (
                    <div className="space-y-2">
                      {entries.map((entry, index) => (
                        <div
                          key={entry.id}
                          className="rounded-xl border border-white/8 bg-white/[0.02] p-3"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-6 shrink-0 text-center font-display text-sm text-gold-400">
                              {index + 1}
                            </span>
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                              <p className="truncate text-sm text-white">
                                {entry.name}
                              </p>
                              <span className="ml-auto shrink-0 font-display text-sm text-gold-200">
                                {formatScore(entry.score)}
                              </span>
                            </div>
                            <div className="flex items-center gap-0.5">
                              <form action={moveTeamAction}>
                                <input
                                  type="hidden"
                                  name="teamId"
                                  value={entry.id}
                                />
                                <input
                                  type="hidden"
                                  name="direction"
                                  value="up"
                                />
                                <Button
                                  type="submit"
                                  variant="ghost"
                                  size="icon"
                                  title="Move up"
                                  disabled={index === 0}
                                >
                                  <ArrowUp className="h-3.5 w-3.5" />
                                </Button>
                              </form>
                              <form action={moveTeamAction}>
                                <input
                                  type="hidden"
                                  name="teamId"
                                  value={entry.id}
                                />
                                <input
                                  type="hidden"
                                  name="direction"
                                  value="down"
                                />
                                <Button
                                  type="submit"
                                  variant="ghost"
                                  size="icon"
                                  title="Move down"
                                  disabled={index === entries.length - 1}
                                >
                                  <ArrowDown className="h-3.5 w-3.5" />
                                </Button>
                              </form>
                              <form action={deleteTeamAction}>
                                <input
                                  type="hidden"
                                  name="teamId"
                                  value={entry.id}
                                />
                                <ConfirmSubmitButton
                                  message={`Delete "${entry.name}" from the scoreboard?`}
                                  variant="ghost"
                                  size="icon"
                                  title="Delete entry"
                                  className="h-9 w-9"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </ConfirmSubmitButton>
                              </form>
                            </div>
                          </div>
                          <ActionForm
                            action={updateTeamAction}
                            submitLabel="Save"
                            variant="subtle"
                            size="sm"
                            className="mt-2 space-y-2 border-t border-white/5 pt-2"
                            submitClassName="h-8"
                          >
                            <input
                              type="hidden"
                              name="teamId"
                              value={entry.id}
                            />
                            <div className="flex items-center gap-2">
                              <Input
                                name="name"
                                defaultValue={entry.name}
                                className="h-8 px-2 py-1 text-xs"
                                aria-label="Entry name"
                              />
                              <Input
                                type="number"
                                name="score"
                                defaultValue={entry.score}
                                className="h-8 w-24 px-2 py-1 text-xs"
                                aria-label="Entry score"
                              />
                            </div>
                          </ActionForm>
                        </div>
                      ))}
                    </div>
                  )}
                </CardBody>
              </Card>
            </>
          )}
        </div>

        <div className="space-y-4">
          <Card className="overflow-hidden">
            <CardHeader
              title="Projector preview"
              description="All entries are shown for preview. The controller reveals them in the live show."
            />
            <div className="aspect-video w-full">
              {board ? (
                <Stage event={publicEvent} logos={logos} showLogos>
                  <LeaderboardView scoreboard={board} />
                </Stage>
              ) : (
                <div className="flex h-full items-center justify-center bg-navy-950 p-6 text-center text-sm text-mist-500">
                  Create the scoreboard to see a preview.
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Reveal flow" />
            <CardBody className="space-y-3 text-xs leading-relaxed text-mist-400">
              <p>
                Publish the scoreboard scene from the controller, then use
                Reveal next or Reveal all to control the audience reveal.
              </p>
              <p>
                The reveal position resets each time the scoreboard scene is
                published, so you can rehearse safely.
              </p>
              <Link
                href="/control"
                className={buttonStyles({
                  variant: "secondary",
                  size: "sm",
                  className: "mt-1",
                })}
              >
                Go to controller
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
