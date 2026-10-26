import Link from "next/link";
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Clock,
  Trash2,
  UsersRound,
} from "lucide-react";

import {
  createSpeakerAction,
  deleteSpeakerAction,
  moveSpeakerAction,
  updateSpeakerAction,
} from "@/app/admin/speakers/actions";
import { AdminNotice, PageHeader } from "@/components/admin/page-header";
import { ActionForm } from "@/components/forms/action-form";
import { ConfirmSubmitButton } from "@/components/forms/confirm-submit-button";
import { ImageUploadField } from "@/components/forms/image-upload-field";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { ANIMATION_PRESETS } from "@/lib/constants";
import {
  getActiveEvent,
  getEventSpeakers,
  toPublicSpeaker,
} from "@/lib/data/events";
import type { PublicSpeaker } from "@/lib/types";
import type { Speaker } from "@/lib/db/schema";
import { truncate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Speakers" };

function SpeakerFields({
  eventId,
  speaker,
  publicSpeaker,
}: {
  eventId: string;
  speaker?: Speaker;
  publicSpeaker?: PublicSpeaker;
}) {
  return (
    <>
      {speaker ? (
        <input type="hidden" name="speakerId" value={speaker.id} />
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name">
          <Input
            name="fullName"
            required
            defaultValue={speaker?.fullName ?? ""}
            placeholder="Hon. Amara Okafor"
          />
        </Field>
        <Field label="Title / role">
          <Input
            name="title"
            defaultValue={speaker?.title ?? ""}
            placeholder="Speaker of the Student Assembly"
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Institution / body">
          <Input
            name="institution"
            defaultValue={speaker?.institution ?? ""}
            placeholder="Student Representative Council"
          />
        </Field>
        <Field label="Session topic">
          <Input
            name="topic"
            defaultValue={speaker?.topic ?? ""}
            placeholder="The future of student legislation"
          />
        </Field>
      </div>
      <Field label="Citation">
        <Textarea
          name="citation"
          defaultValue={speaker?.citation ?? ""}
          placeholder="Full citation text shown on the citation scene."
          className="min-h-32"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <ImageUploadField
          name="photoFileId"
          label="Portrait"
          kind="speaker_photo"
          eventId={eventId}
          initialFileId={speaker?.photoFileId}
          initialUrl={publicSpeaker?.photoUrl}
          hint="A clear portrait works best. Phone photos are compressed automatically."
        />
        <ImageUploadField
          name="backgroundFileId"
          label="Background image"
          kind="speaker_background"
          eventId={eventId}
          initialFileId={speaker?.backgroundFileId}
          initialUrl={publicSpeaker?.backgroundUrl}
          hint="Optional. Used as a subtle backdrop behind the speaker."
          aspect="wide"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Display duration (seconds)">
          <Input
            type="number"
            name="durationSeconds"
            min={10}
            max={3600}
            defaultValue={speaker?.durationSeconds ?? 120}
          />
        </Field>
        <Field label="Animation">
          <Select name="animation" defaultValue={speaker?.animation ?? "fade"}>
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

export default async function SpeakersPage() {
  const event = await getActiveEvent();
  if (!event) {
    return (
      <div>
        <PageHeader title="Speakers" eyebrow="Roster" />
        <EmptyState
          icon={<UsersRound className="h-6 w-6" />}
          title="No active summit"
          description="Activate a summit before adding speakers."
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

  const speakers = await getEventSpeakers(event.id);
  const publicById = new Map(
    speakers.map((speaker) => [speaker.id, toPublicSpeaker(speaker)]),
  );

  return (
    <div>
      <PageHeader
        eyebrow="Roster"
        title="Speakers & citations"
        description="Profiles power the introduction, citation and Speaking Now scenes. Edit a profile and publish it from the controller when the time comes."
        actions={
          <Badge tone="gold">
            {speakers.length} {speakers.length === 1 ? "speaker" : "speakers"}
          </Badge>
        }
      />

      <AdminNotice />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          {speakers.length === 0 ? (
            <EmptyState
              icon={<UsersRound className="h-6 w-6" />}
              title="No speakers yet"
              description="Add the first speaker using the form on the right. Their profile will be available to every speaker scene."
            />
          ) : (
            speakers.map((speaker, index) => {
              const pub = publicById.get(speaker.id);
              return (
                <Card key={speaker.id}>
                  <CardBody className="space-y-4">
                    <div className="flex flex-wrap items-start gap-4">
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-navy-950/60">
                        {pub?.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={pub.photoUrl}
                            alt={speaker.fullName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center font-display text-2xl text-gold-500/70">
                            {speaker.fullName
                              .split(/\s+/)
                              .slice(0, 2)
                              .map((part) => part[0])
                              .join("")}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-display text-xl text-white">
                            {speaker.fullName}
                          </h2>
                          <Badge tone="neutral">#{index + 1}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-mist-400">
                          {[speaker.title, speaker.institution]
                            .filter(Boolean)
                            .join(" · ") || "Profile details incomplete"}
                        </p>
                        {speaker.topic ? (
                          <p className="mt-2 text-sm text-gold-200/90">
                            {speaker.topic}
                          </p>
                        ) : null}
                        <p className="mt-2 text-xs leading-relaxed text-mist-500">
                          {speaker.citation
                            ? truncate(speaker.citation, 220)
                            : "No citation added yet."}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <form action={moveSpeakerAction}>
                          <input
                            type="hidden"
                            name="speakerId"
                            value={speaker.id}
                          />
                          <input type="hidden" name="direction" value="up" />
                          <button
                            type="submit"
                            className={buttonStyles({
                              variant: "ghost",
                              size: "icon",
                            })}
                            title="Move up"
                            disabled={index === 0}
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                        </form>
                        <form action={moveSpeakerAction}>
                          <input
                            type="hidden"
                            name="speakerId"
                            value={speaker.id}
                          />
                          <input type="hidden" name="direction" value="down" />
                          <button
                            type="submit"
                            className={buttonStyles({
                              variant: "ghost",
                              size: "icon",
                            })}
                            title="Move down"
                            disabled={index === speakers.length - 1}
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                        </form>
                        <form action={deleteSpeakerAction}>
                          <input
                            type="hidden"
                            name="speakerId"
                            value={speaker.id}
                          />
                          <ConfirmSubmitButton
                            message={`Delete ${speaker.fullName}? Scenes using this speaker will lose the profile.`}
                            variant="ghost"
                            size="icon"
                            title="Delete speaker"
                            className="h-9 w-9"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </ConfirmSubmitButton>
                        </form>
                      </div>
                    </div>

                    <details className="rounded-xl border border-white/8 bg-white/[0.02]">
                      <summary className="cursor-pointer px-4 py-3 text-xs font-medium uppercase tracking-[0.16em] text-mist-400 transition-colors hover:text-gold-200">
                        Edit profile
                      </summary>
                      <div className="border-t border-white/5 p-4">
                        <ActionForm
                          action={updateSpeakerAction}
                          submitLabel="Save speaker"
                        >
                          <SpeakerFields
                            eventId={event.id}
                            speaker={speaker}
                            publicSpeaker={pub}
                          />
                        </ActionForm>
                      </div>
                    </details>
                  </CardBody>
                </Card>
              );
            })
          )}
        </div>

        <div>
          <Card className="xl:sticky xl:top-6">
            <CardHeader
              title="Add a speaker"
              description="Citations and portraits can be refined later."
            />
            <CardBody>
              <ActionForm
                action={createSpeakerAction}
                submitLabel="Add speaker"
                pendingLabel="Adding…"
              >
                <SpeakerFields eventId={event.id} />
              </ActionForm>
            </CardBody>
          </Card>

          <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 text-xs text-mist-500">
            <Clock className="h-3.5 w-3.5 shrink-0 text-gold-500/70" />
            Display duration is a reference for the controller, not an automatic
            timer.
          </div>
        </div>
      </div>
    </div>
  );
}
