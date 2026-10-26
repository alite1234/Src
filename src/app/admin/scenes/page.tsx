import Link from "next/link";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ListOrdered,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import {
  addSceneToQueueAction,
  createSceneAction,
  deleteSceneAction,
  moveSceneInQueueAction,
  removeSceneFromQueueAction,
  updateSceneAction,
} from "@/app/admin/scenes/actions";
import { AdminNotice, PageHeader } from "@/components/admin/page-header";
import { ActionForm } from "@/components/forms/action-form";
import { ConfirmSubmitButton } from "@/components/forms/confirm-submit-button";
import { SceneView } from "@/components/projector/scene-view";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import {
  ANIMATION_PRESETS,
  SCENE_TYPES,
  SCENE_TYPE_MAP,
} from "@/lib/constants";
import {
  getActiveEvent,
  getEventLogos,
  getEventQueue,
  getEventScenes,
  getEventScoreboard,
  getEventSpeakers,
  toPublicEvent,
} from "@/lib/data/events";
import type { PublicScene } from "@/lib/types";
import type { Speaker } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export const metadata = { title: "Scenes" };

function SceneFields({
  scene,
  speakers,
}: {
  scene?: PublicScene;
  speakers: Speaker[];
}) {
  return (
    <>
      {scene ? <input type="hidden" name="sceneId" value={scene.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Scene type">
          <Select name="type" defaultValue={scene?.type ?? "welcome"}>
            {SCENE_TYPES.filter((type) => type.creatable).map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Scene title">
          <Input
            name="title"
            required
            defaultValue={scene?.title ?? ""}
            placeholder="Opening welcome"
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Speaker" hint="Used by speaker intro, citation and Speaking Now scenes.">
          <Select name="speakerId" defaultValue={scene?.speaker?.id ?? ""}>
            <option value="">No speaker</option>
            {speakers.map((speaker) => (
              <option key={speaker.id} value={speaker.id}>
                {speaker.fullName}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Animation">
          <Select name="animation" defaultValue={scene?.animation ?? "fade"}>
            {ANIMATION_PRESETS.map((preset) => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Display duration (seconds)" hint="Optional reference for the controller.">
          <Input
            type="number"
            name="durationSeconds"
            min={5}
            max={3600}
            defaultValue={scene?.durationSeconds ?? ""}
            placeholder="No timer"
          />
        </Field>
        <Field label="Logos on this scene">
          <Select
            name="logoMode"
            defaultValue={scene?.logoVisibility?.mode ?? "inherit"}
          >
            <option value="inherit">Inherit event settings</option>
            <option value="show">Always show</option>
            <option value="hide">Always hide</option>
          </Select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Heading override">
          <Input
            name="heading"
            defaultValue={scene?.content.heading ?? ""}
            placeholder="Defaults to the scene title"
          />
        </Field>
        <Field label="Subheading">
          <Input
            name="subheading"
            defaultValue={scene?.content.subheading ?? ""}
            placeholder="Optional supporting line"
          />
        </Field>
      </div>
      <Field label="Body text">
        <Textarea
          name="body"
          defaultValue={scene?.content.body ?? ""}
          placeholder="Main message for this scene."
          className="min-h-28"
        />
      </Field>
      <Field label="Footer label">
        <Input
          name="footer"
          defaultValue={scene?.content.footer ?? ""}
          placeholder="Optional small label"
        />
      </Field>
    </>
  );
}

export default async function ScenesPage() {
  const event = await getActiveEvent();
  if (!event) {
    return (
      <div>
        <PageHeader title="Scenes" eyebrow="Presentation" />
        <EmptyState
          icon={<ListOrdered className="h-6 w-6" />}
          title="No active summit"
          description="Activate a summit before building scenes."
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

  const [scenes, queue, speakers, logos, scoreboard] = await Promise.all([
    getEventScenes(event.id),
    getEventQueue(event.id),
    getEventSpeakers(event.id),
    getEventLogos(event.id),
    getEventScoreboard(event.id),
  ]);
  const publicEvent = toPublicEvent(event);
  const sceneById = new Map(scenes.map((scene) => [scene.id, scene]));
  const queuedIds = new Set(queue.map((item) => item.sceneId));

  return (
    <div>
      <PageHeader
        eyebrow="Presentation"
        title="Scene library & queue"
        description="Scenes are prepared here, rehearsed in the controller, and published to the projector when you are ready. Editing a scene never changes what is currently on screen."
        actions={
          <Badge tone="gold">
            {scenes.length} scenes · {queue.length} queued
          </Badge>
        }
      />

      <AdminNotice />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Live queue"
              description="The controller moves through this order during the summit."
              actions={
                <Link
                  href="/control"
                  className={buttonStyles({ variant: "secondary", size: "sm" })}
                >
                  Open controller
                </Link>
              }
            />
            <CardBody>
              {queue.length === 0 ? (
                <EmptyState
                  icon={<ListOrdered className="h-5 w-5" />}
                  title="The queue is empty"
                  description="New scenes are queued automatically. Add existing scenes from the library below."
                />
              ) : (
                <ol className="space-y-2">
                  {queue.map((item, index) => {
                    const scene = sceneById.get(item.sceneId);
                    if (!scene) return null;
                    return (
                      <li
                        key={item.id}
                        className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2"
                      >
                        <span className="w-6 shrink-0 text-center font-display text-sm text-gold-400">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-white">
                            {scene.title}
                          </p>
                          <p className="text-[10px] uppercase tracking-[0.16em] text-mist-600">
                            {SCENE_TYPE_MAP[scene.type]?.label ?? scene.type}
                          </p>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <form action={moveSceneInQueueAction}>
                            <input type="hidden" name="itemId" value={item.id} />
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
                          <form action={moveSceneInQueueAction}>
                            <input type="hidden" name="itemId" value={item.id} />
                            <input type="hidden" name="direction" value="down" />
                            <button
                              type="submit"
                              className={buttonStyles({
                                variant: "ghost",
                                size: "icon",
                              })}
                              title="Move down"
                              disabled={index === queue.length - 1}
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                          </form>
                          <form action={removeSceneFromQueueAction}>
                            <input type="hidden" name="itemId" value={item.id} />
                            <button
                              type="submit"
                              className={buttonStyles({
                                variant: "ghost",
                                size: "icon",
                              })}
                              title="Remove from queue"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </form>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </CardBody>
          </Card>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-xl text-white">Scene library</h2>
              <Badge tone="neutral">{scenes.length} total</Badge>
            </div>
            {scenes.length === 0 ? (
              <EmptyState
                icon={<ListOrdered className="h-6 w-6" />}
                title="No scenes yet"
                description="Create the opening scene and build out the ceremony from the form on the right."
              />
            ) : (
              <div className="grid gap-4">
                {scenes.map((scene) => (
                  <Card key={scene.id}>
                    <CardBody className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone="gold">
                              {SCENE_TYPE_MAP[scene.type]?.label ?? scene.type}
                            </Badge>
                            {queuedIds.has(scene.id) ? (
                              <Badge tone="success">Queued</Badge>
                            ) : (
                              <Badge tone="neutral">Not queued</Badge>
                            )}
                          </div>
                          <h3 className="mt-2 font-display text-lg text-white">
                            {scene.title}
                          </h3>
                          <p className="mt-1 text-xs leading-relaxed text-mist-500">
                            {scene.content.body
                              ? scene.content.body.slice(0, 180)
                              : SCENE_TYPE_MAP[scene.type]?.description}
                          </p>
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-mist-600">
                            <span>{scene.animation}</span>
                            <span>·</span>
                            <span>
                              {scene.durationSeconds
                                ? `${scene.durationSeconds}s`
                                : "No timer"}
                            </span>
                            {scene.speaker ? (
                              <>
                                <span>·</span>
                                <span>{scene.speaker.fullName}</span>
                              </>
                            ) : null}
                          </div>
                        </div>
                        <div className="overflow-hidden rounded-lg border border-white/10">
                          <div className="aspect-video">
                            <SceneView
                              scene={scene}
                              event={publicEvent}
                              logos={logos}
                              scoreboard={scoreboard}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {!queuedIds.has(scene.id) ? (
                          <form action={addSceneToQueueAction}>
                            <input
                              type="hidden"
                              name="sceneId"
                              value={scene.id}
                            />
                            <button
                              type="submit"
                              className={buttonStyles({
                                variant: "secondary",
                                size: "sm",
                              })}
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Add to queue
                            </button>
                          </form>
                        ) : null}
                        <form action={deleteSceneAction}>
                          <input
                            type="hidden"
                            name="sceneId"
                            value={scene.id}
                          />
                          <ConfirmSubmitButton
                            message={`Delete "${scene.title}"? This also removes it from the queue.`}
                            variant="danger"
                            size="sm"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </ConfirmSubmitButton>
                        </form>
                      </div>

                      <details className="rounded-xl border border-white/8 bg-white/[0.02]">
                        <summary className="cursor-pointer px-4 py-3 text-xs font-medium uppercase tracking-[0.16em] text-mist-400 transition-colors hover:text-gold-200">
                          Edit scene
                        </summary>
                        <div className="border-t border-white/5 p-4">
                          <ActionForm
                            action={updateSceneAction}
                            submitLabel="Save scene"
                          >
                            <SceneFields scene={scene} speakers={speakers} />
                          </ActionForm>
                        </div>
                      </details>
                    </CardBody>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <Card className="xl:sticky xl:top-6">
            <CardHeader
              title="Create a scene"
              description="New scenes are added to the end of the queue automatically."
            />
            <CardBody>
              <ActionForm
                action={createSceneAction}
                submitLabel="Create scene"
                pendingLabel="Creating…"
              >
                <SceneFields speakers={speakers} />
              </ActionForm>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
