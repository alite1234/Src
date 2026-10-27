"use client";

import { useMemo, useState } from "react";
import { Info } from "lucide-react";

import { ImageUploadField } from "@/components/forms/image-upload-field";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { ANIMATION_PRESETS, SCENE_TYPES } from "@/lib/constants";
import type { PublicScene, SceneType } from "@/lib/types";
import type { Speaker } from "@/lib/db/schema";

type ContentField = "heading" | "subheading" | "body" | "footer";

type SceneTypeConfig = {
  contentFields: ContentField[];
  usesSpeaker: boolean;
  speakerRequired: boolean;
  note?: string;
};

const SCENE_TYPE_CONFIG: Record<SceneType, SceneTypeConfig> = {
  opening: {
    contentFields: ["heading", "subheading", "body"],
    usesSpeaker: false,
    speakerRequired: false,
    note: "Date, venue and summit branding come from the summit settings automatically.",
  },
  welcome: {
    contentFields: ["heading", "body", "footer"],
    usesSpeaker: false,
    speakerRequired: false,
  },
  speaker_intro: {
    contentFields: ["body"],
    usesSpeaker: true,
    speakerRequired: true,
    note: "Portrait, title, institution and topic come from the speaker profile.",
  },
  speaking_now: {
    contentFields: [],
    usesSpeaker: true,
    speakerRequired: true,
    note: "Everything on screen comes from the speaker profile.",
  },
  citation: {
    contentFields: ["body"],
    usesSpeaker: true,
    speakerRequired: true,
    note: "The citation text comes from the speaker profile unless you override it below.",
  },
  topic: {
    contentFields: ["heading", "subheading", "body"],
    usesSpeaker: false,
    speakerRequired: false,
  },
  announcement: {
    contentFields: ["heading", "body", "footer"],
    usesSpeaker: false,
    speakerRequired: false,
  },
  countdown: {
    contentFields: ["heading", "body"],
    usesSpeaker: false,
    speakerRequired: false,
    note: "The timer itself is started from the controller's countdown controls.",
  },
  quiz_intro: {
    contentFields: ["heading", "body"],
    usesSpeaker: false,
    speakerRequired: false,
    note: "The game PIN appears automatically once the quiz is launched.",
  },
  scoreboard: {
    contentFields: [],
    usesSpeaker: false,
    speakerRequired: false,
    note: "Standings and reveal behaviour come from the scoreboard section.",
  },
  fixtures: {
    contentFields: ["heading", "subheading"],
    usesSpeaker: false,
    speakerRequired: false,
    note: "Matches, scores and the table draw come from the fixtures section.",
  },
  break: {
    contentFields: ["body"],
    usesSpeaker: false,
    speakerRequired: false,
  },
  closing: {
    contentFields: ["heading", "body"],
    usesSpeaker: false,
    speakerRequired: false,
  },
  quiz_question: {
    contentFields: [],
    usesSpeaker: false,
    speakerRequired: false,
  },
  answer_reveal: {
    contentFields: [],
    usesSpeaker: false,
    speakerRequired: false,
  },
};

const FIELD_LABELS: Record<ContentField, string> = {
  heading: "Heading override",
  subheading: "Subheading",
  body: "Body text",
  footer: "Footer label",
};

const FIELD_PLACEHOLDERS: Record<ContentField, string> = {
  heading: "Defaults to the scene title",
  subheading: "Optional supporting line",
  body: "Main message for this scene.",
  footer: "Optional small label",
};

export function SceneFields({
  eventId,
  scene,
  speakers,
}: {
  eventId: string;
  scene?: PublicScene;
  speakers: Speaker[];
}) {
  const [type, setType] = useState<SceneType>(scene?.type ?? "welcome");
  const config = SCENE_TYPE_CONFIG[type];
  const creatableTypes = useMemo(
    () => SCENE_TYPES.filter((item) => item.creatable),
    [],
  );

  return (
    <>
      {scene ? <input type="hidden" name="sceneId" value={scene.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Scene type" hint="The form adapts to the type you pick.">
          <Select
            name="type"
            defaultValue={type}
            onChange={(event) => setType(event.target.value as SceneType)}
          >
            {creatableTypes.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
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

      {config.usesSpeaker ? (
        <Field
          label="Speaker"
          hint={
            config.speakerRequired
              ? "Required for this scene type."
              : "Optional for this scene type."
          }
        >
          <Select name="speakerId" defaultValue={scene?.speaker?.id ?? ""}>
            <option value="">No speaker</option>
            {speakers.map((speaker) => (
              <option key={speaker.id} value={speaker.id}>
                {speaker.fullName}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Animation">
          <Select name="animation" defaultValue={scene?.animation ?? "fade"}>
            {ANIMATION_PRESETS.map((preset) => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Display duration (seconds)"
          hint="Optional. The controller can auto-advance after it."
        >
          <Input
            type="number"
            name="durationSeconds"
            min={5}
            max={3600}
            defaultValue={scene?.durationSeconds ?? ""}
            placeholder="No timer"
          />
        </Field>
      </div>

      <ImageUploadField
        name="backgroundFileId"
        label="Background image"
        kind="scene_background"
        eventId={eventId}
        initialFileId={scene?.backgroundFileId ?? null}
        initialUrl={scene?.backgroundUrl}
        hint="Optional. Shown full-screen behind this scene's content."
        aspect="wide"
      />

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

      {config.contentFields.length > 0 ? (
        <div className="space-y-4">
          {config.contentFields.includes("heading") &&
          config.contentFields.includes("subheading") ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={FIELD_LABELS.heading}>
                <Input
                  name="heading"
                  defaultValue={scene?.content.heading ?? ""}
                  placeholder={FIELD_PLACEHOLDERS.heading}
                />
              </Field>
              <Field label={FIELD_LABELS.subheading}>
                <Input
                  name="subheading"
                  defaultValue={scene?.content.subheading ?? ""}
                  placeholder={FIELD_PLACEHOLDERS.subheading}
                />
              </Field>
            </div>
          ) : (
            config.contentFields.map((field) => (
              <Field key={field} label={FIELD_LABELS[field]}>
                {field === "body" ? (
                  <Textarea
                    name="body"
                    defaultValue={scene?.content.body ?? ""}
                    placeholder={FIELD_PLACEHOLDERS.body}
                    className="min-h-28"
                  />
                ) : (
                  <Input
                    name={field}
                    defaultValue={scene?.content[field] ?? ""}
                    placeholder={FIELD_PLACEHOLDERS[field]}
                  />
                )}
              </Field>
            ))
          )}
        </div>
      ) : null}

      {config.note ? (
        <p className="flex items-start gap-2 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 text-xs leading-relaxed text-mist-400">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-500/70" />
          {config.note}
        </p>
      ) : null}
    </>
  );
}
