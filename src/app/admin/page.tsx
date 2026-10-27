import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Circle,
  Image as ImageIcon,
  ListOrdered,
  Plus,
  Radio,
  Trash2,
  Trophy,
  UsersRound,
} from "lucide-react";

import {
  activateEventAction,
  createEventAction,
  deleteEventAction,
  updateEventAction,
} from "@/app/admin/actions";
import { AdminNotice, PageHeader } from "@/components/admin/page-header";
import { ActionForm } from "@/components/forms/action-form";
import { ConfirmSubmitButton } from "@/components/forms/confirm-submit-button";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import {
  ANIMATION_PRESETS,
  LOGO_LAYOUTS,
  THEME_LIST,
} from "@/lib/constants";
import {
  getAllEvents,
  getActiveEvent,
  getAdminLogos,
  getEventQuizzes,
  getEventScenes,
  getEventScoreboard,
  getEventSpeakers,
} from "@/lib/data/events";
import type { Event } from "@/lib/db/schema";
import { formatShortDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Summit overview" };

function EventFields({ event }: { event?: Event }) {
  return (
    <>
      {event ? <input type="hidden" name="eventId" value={event.id} /> : null}
      <Field label="Summit title">
        <Input
          name="title"
          required
          defaultValue={event?.title ?? ""}
          placeholder="SRC Legislative Summit 2026"
        />
      </Field>
      <Field label="Subtitle" hint="Shown beneath the main title on opening screens.">
        <Input
          name="subtitle"
          defaultValue={event?.subtitle ?? ""}
          placeholder="A chamber for bold student voices"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date">
          <Input
            type="date"
            name="eventDate"
            defaultValue={event?.eventDate ?? ""}
          />
        </Field>
        <Field label="Venue">
          <Input
            name="venue"
            defaultValue={event?.venue ?? ""}
            placeholder="Great Hall, Student Union"
          />
        </Field>
      </div>
      <Field label="Description">
        <Textarea
          name="description"
          defaultValue={event?.description ?? ""}
          placeholder="A short description used on welcome and citation screens."
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Opening message">
          <Textarea
            name="openingMessage"
            defaultValue={event?.openingMessage ?? ""}
            placeholder="Welcome to the summit…"
          />
        </Field>
        <Field label="Closing message">
          <Textarea
            name="closingMessage"
            defaultValue={event?.closingMessage ?? ""}
            placeholder="Thank you for attending…"
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Event code" hint="6-character code for controller and projector access.">
          <Input
            name="eventCode"
            defaultValue={event?.eventCode ?? ""}
            placeholder="ABC123"
            maxLength={6}
          />
        </Field>
        <Field label="Theme">
          <Select name="theme" defaultValue={event?.theme ?? "navy-gold"}>
            {THEME_LIST.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Default animation">
          <Select
            name="animationStyle"
            defaultValue={event?.animationStyle ?? "fade"}
          >
            {ANIMATION_PRESETS.map((preset) => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Logo layout">
          <Select
            name="logoLayout"
            defaultValue={event?.logoLayout ?? "primary"}
          >
            {LOGO_LAYOUTS.map((layout) => (
              <option key={layout.value} value={layout.value}>
                {layout.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field
        label="Summit status"
        hint="Mark the summit ready once branding is uploaded."
      >
        <Select name="status" defaultValue={event?.status ?? "draft"}>
          <option value="draft">Draft</option>
          <option value="ready">Ready</option>
          <option value="live">Live</option>
          <option value="archived">Archived</option>
        </Select>
      </Field>
    </>
  );
}

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const { notice } = await searchParams;
  const [events, active, activeEvent] = await Promise.all([
    getAllEvents(),
    getActiveEvent(),
    getActiveEvent(),
  ]);
  const event = activeEvent;

  const [logos, speakers, scenes, quizzes, scoreboard] = event
    ? await Promise.all([
        getAdminLogos(event.id),
        getEventSpeakers(event.id),
        getEventScenes(event.id),
        getEventQuizzes(event.id),
        getEventScoreboard(event.id),
      ])
    : [[], [], [], [], null];

  const checklist = [
    {
      label: "Summit created",
      done: Boolean(event),
      href: "/admin",
    },
    {
      label: "Branding uploaded",
      done: logos.length > 0,
      href: "/admin/branding",
    },
    {
      label: "Speaker roster prepared",
      done: speakers.length > 0,
      href: "/admin/speakers",
    },
    {
      label: "Scene queue built",
      done: scenes.length > 0,
      href: "/admin/scenes",
    },
    {
      label: "Quiz questions ready",
      done: quizzes.some((quiz) => Number(quiz.questionCount) > 0),
      href: "/admin/quiz",
    },
    {
      label: "Scoreboard configured",
      done: Boolean(scoreboard),
      href: "/admin/scoreboard",
    },
  ];

  const completed = checklist.filter((item) => item.done).length;

  return (
    <div>
      <PageHeader
        eyebrow="Administration"
        title="Summit command centre"
        description="Prepare the stage, roster, quiz and scoreboards. Publishing happens from the controller dashboard."
        actions={
          <>
            <Link
              href="/control"
              className={buttonStyles({ variant: "secondary", size: "sm" })}
            >
              <Radio className="h-3.5 w-3.5" />
              Controller
            </Link>
            <Link
              href="/project"
              target="_blank"
              className={buttonStyles({ variant: "ghost", size: "sm" })}
            >
              Projector
            </Link>
          </>
        }
      />

      <AdminNotice notice={notice} />

      {!active && events.length > 0 ? (
        <div className="mb-5 rounded-xl border border-amber-400/25 bg-amber-400/[0.07] px-4 py-3 text-sm text-amber-100">
          No summit is active. Activate one below before building content.
        </div>
      ) : null}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Logos",
            value: logos.length,
            icon: ImageIcon,
            href: "/admin/branding",
          },
          {
            label: "Speakers",
            value: speakers.length,
            icon: UsersRound,
            href: "/admin/speakers",
          },
          {
            label: "Scenes",
            value: scenes.length,
            icon: ListOrdered,
            href: "/admin/scenes",
          },
          {
            label: "Quizzes",
            value: quizzes.length,
            icon: Trophy,
            href: "/admin/quiz",
          },
        ].map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="panel group rounded-2xl p-4 transition-colors hover:border-gold-500/30"
          >
            <div className="flex items-center justify-between">
              <stat.icon className="h-4 w-4 text-gold-400/80" />
              <ArrowRight className="h-3.5 w-3.5 text-mist-600 transition-transform group-hover:translate-x-0.5 group-hover:text-gold-300" />
            </div>
            <p className="mt-4 font-display text-3xl text-white">{stat.value}</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-mist-500">
              {stat.label}
            </p>
          </Link>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          {event ? (
            <Card>
              <CardHeader
                title="Active summit"
                description="These details feed the opening, welcome and closing screens."
                actions={
                  <Badge tone={event.isActive ? "success" : "neutral"}>
                    {event.isActive ? "Active" : event.status}
                  </Badge>
                }
              />
              <CardBody>
                <ActionForm
                  action={updateEventAction}
                  submitLabel="Save summit settings"
                >
                  <EventFields event={event} />
                </ActionForm>
              </CardBody>
            </Card>
          ) : null}

          {events.length > 0 ? (
            <Card>
              <CardHeader
                title="Summits"
                description="Only one summit can be live at a time."
                actions={
                  <Badge tone="neutral">{events.length} total</Badge>
                }
              />
              <CardBody className="space-y-3">
                {events.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-white">
                          {item.title}
                        </p>
                        {item.isActive ? (
                          <Badge tone="gold">Active</Badge>
                        ) : (
                          <Badge tone="neutral">{item.status}</Badge>
                        )}
                      </div>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-mist-500">
                        <CalendarDays className="h-3 w-3" />
                        {formatShortDate(item.eventDate) || "Date not set"}
                        {item.venue ? ` · ${item.venue}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!item.isActive ? (
                        <form action={activateEventAction}>
                          <input type="hidden" name="eventId" value={item.id} />
                          <button
                            type="submit"
                            className={buttonStyles({
                              variant: "secondary",
                              size: "sm",
                            })}
                          >
                            Activate
                          </button>
                        </form>
                      ) : null}
                      <form action={deleteEventAction}>
                        <input type="hidden" name="eventId" value={item.id} />
                        <ConfirmSubmitButton
                          message={`Delete "${item.title}"? All branding, scenes, quizzes and results for this summit will be removed.`}
                          title="Delete summit"
                          variant="ghost"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </ConfirmSubmitButton>
                      </form>
                    </div>
                  </div>
                ))}
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardHeader
              title={events.length > 0 ? "Create another summit" : "Create your summit"}
              description="Start with the event identity. You can refine branding and content afterwards."
              actions={
                <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-gold-500/25 bg-gold-500/10 text-gold-300">
                  <Plus className="h-4 w-4" />
                </span>
              }
            />
            <CardBody>
              <ActionForm
                action={createEventAction}
                submitLabel="Create summit"
                pendingLabel="Creating…"
              >
                <EventFields />
              </ActionForm>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader
              title="Setup checklist"
              description={`${completed} of ${checklist.length} complete`}
            />
            <CardBody className="space-y-2">
              {checklist.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-white/[0.04]"
                >
                  {item.done ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-mist-600" />
                  )}
                  <span
                    className={
                      item.done ? "text-mist-300" : "text-mist-400"
                    }
                  >
                    {item.label}
                  </span>
                </Link>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Run the show"
              description="Private previews, then publish to the projector."
            />
            <CardBody className="space-y-2">
              <Link
                href="/control"
                className={buttonStyles({
                  variant: "primary",
                  size: "md",
                  className: "w-full justify-between",
                })}
              >
                Open controller
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/project"
                target="_blank"
                className={buttonStyles({
                  variant: "secondary",
                  size: "md",
                  className: "w-full justify-between",
                })}
              >
                Open projector
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/play"
                target="_blank"
                className={buttonStyles({
                  variant: "ghost",
                  size: "md",
                  className: "w-full justify-between",
                })}
              >
                Participant view
                <ArrowRight className="h-4 w-4" />
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
