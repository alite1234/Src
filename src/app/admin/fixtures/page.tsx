import Link from "next/link";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CalendarRange,
  Trash2,
} from "lucide-react";

import {
  createFixtureAction,
  deleteFixtureAction,
  moveFixtureAction,
  updateFixtureAction,
} from "@/app/admin/fixtures/actions";
import { AdminNotice, PageHeader } from "@/components/admin/page-header";
import { ActionForm } from "@/components/forms/action-form";
import { ConfirmSubmitButton } from "@/components/forms/confirm-submit-button";
import { QuickActionForm } from "@/components/forms/quick-action-form";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select } from "@/components/ui/field";
import { getActiveEvent, getEventFixtures } from "@/lib/data/events";
import type { PublicFixture } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = { title: "Fixtures" };

const FIXTURE_STATUSES = [
  { value: "scheduled", label: "Scheduled" },
  { value: "live", label: "Live" },
  { value: "completed", label: "Completed" },
] as const;

function FixtureFields({ fixture }: { fixture?: PublicFixture }) {
  return (
    <>
      {fixture ? (
        <input type="hidden" name="fixtureId" value={fixture.id} />
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Stage or group" hint="Fixtures are grouped by this label on screen.">
          <Input
            name="stage"
            required
            defaultValue={fixture?.stage ?? "Group stage"}
            placeholder="Group stage"
          />
        </Field>
        <Field label="Status">
          <Select name="status" defaultValue={fixture?.status ?? "scheduled"}>
            {FIXTURE_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Team A">
          <Input
            name="teamA"
            required
            defaultValue={fixture?.teamA ?? ""}
            placeholder="Delegation A"
          />
        </Field>
        <Field label="Team B">
          <Input
            name="teamB"
            required
            defaultValue={fixture?.teamB ?? ""}
            placeholder="Delegation B"
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Score A" hint="Leave blank until the match has a result.">
          <Input
            type="number"
            name="scoreA"
            min={0}
            max={999}
            defaultValue={fixture?.scoreA ?? ""}
            placeholder="No score"
          />
        </Field>
        <Field label="Score B">
          <Input
            type="number"
            name="scoreB"
            min={0}
            max={999}
            defaultValue={fixture?.scoreB ?? ""}
            placeholder="No score"
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Kickoff (UTC)" hint="Optional. Shown on upcoming matches.">
          <Input
            type="datetime-local"
            name="scheduledAt"
            defaultValue={fixture?.scheduledAt?.slice(0, 16) ?? ""}
          />
        </Field>
        <Field label="Venue">
          <Input
            name="venue"
            defaultValue={fixture?.venue ?? ""}
            placeholder="Main hall"
          />
        </Field>
      </div>
    </>
  );
}

export default async function FixturesPage() {
  const event = await getActiveEvent();
  if (!event) {
    return (
      <div>
        <PageHeader title="Fixtures" eyebrow="Programme" />
        <EmptyState
          icon={<CalendarRange className="h-6 w-6" />}
          title="No active summit"
          description="Activate a summit before building the fixture draw."
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

  const fixtures = await getEventFixtures(event.id);

  return (
    <div>
      <PageHeader
        eyebrow="Programme"
        title="Fixtures"
        description="Build the match draw, keep scores up to date, and publish a fixtures scene to show it on the projector."
        actions={<Badge tone="gold">{fixtures.length} matches</Badge>}
      />

      <AdminNotice />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <Card>
            <CardHeader
              title="Add a match"
              description="New matches are appended to the end of the draw."
            />
            <CardBody>
              <ActionForm
                action={createFixtureAction}
                submitLabel="Add match"
                pendingLabel="Adding…"
              >
                <FixtureFields />
              </ActionForm>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="The draw"
              description="Use the arrows to control the order matches appear on screen."
              actions={
                <Badge tone="neutral">{fixtures.length} matches</Badge>
              }
            />
            <CardBody className="space-y-2">
              {fixtures.length === 0 ? (
                <EmptyState
                  icon={<CalendarRange className="h-5 w-5" />}
                  title="No matches yet"
                  description="Add the first match above, then publish a fixtures scene to show the draw."
                />
              ) : (
                fixtures.map((fixture, index) => (
                  <div
                    key={fixture.id}
                    className="rounded-xl border border-white/8 bg-white/[0.02] p-3"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="w-6 shrink-0 text-center font-display text-sm text-gold-400">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone="neutral">{fixture.stage}</Badge>
                          {fixture.status === "live" ? (
                            <Badge tone="gold">Live</Badge>
                          ) : fixture.status === "completed" ? (
                            <Badge tone="neutral">Full time</Badge>
                          ) : null}
                        </div>
                        <p className="mt-1 truncate text-sm text-white">
                          {fixture.teamA}
                          <span className="mx-2 text-mist-500">vs</span>
                          {fixture.teamB}
                          {fixture.scoreA !== null && fixture.scoreB !== null ? (
                            <span className="ml-2 font-display text-gold-200">
                              {fixture.scoreA}–{fixture.scoreB}
                            </span>
                          ) : null}
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <QuickActionForm action={moveFixtureAction}>
                          <input
                            type="hidden"
                            name="fixtureId"
                            value={fixture.id}
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
                        </QuickActionForm>
                        <QuickActionForm action={moveFixtureAction}>
                          <input
                            type="hidden"
                            name="fixtureId"
                            value={fixture.id}
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
                            disabled={index === fixtures.length - 1}
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                        </QuickActionForm>
                        <ActionForm
                          action={deleteFixtureAction}
                          submitLabel="Delete"
                          hideSubmit
                        >
                          <input
                            type="hidden"
                            name="fixtureId"
                            value={fixture.id}
                          />
                          <ConfirmSubmitButton
                            message={`Delete "${fixture.teamA} vs ${fixture.teamB}"?`}
                            variant="ghost"
                            size="icon"
                            title="Delete match"
                            className="h-9 w-9"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </ConfirmSubmitButton>
                        </ActionForm>
                      </div>
                    </div>

                    <details className="rounded-xl border border-white/8 bg-white/[0.02]">
                      <summary className="cursor-pointer px-3 py-2 text-xs uppercase tracking-[0.2em] text-mist-400">
                        Edit match
                      </summary>
                      <div className="px-3 pb-3">
                        <ActionForm
                          action={updateFixtureAction}
                          submitLabel="Save match"
                        >
                          <FixtureFields fixture={fixture} />
                        </ActionForm>
                      </div>
                    </details>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="How it shows on screen" />
            <CardBody className="space-y-3 text-xs leading-relaxed text-mist-400">
              <p>
                Publish a “Fixtures & Table Draw” scene from the controller.
                Matches are grouped by stage, with live matches highlighted and
                completed matches showing the final score.
              </p>
              <p>
                Score and status changes appear on the projector the moment you
                save them.
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
