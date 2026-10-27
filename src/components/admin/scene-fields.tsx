"use client";

import { useMemo, useState } from "react";
import { Info, HelpCircle } from "lucide-react";

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
  hasImageFields?: boolean;
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
  image_topic: {
    contentFields: ["heading"],
    usesSpeaker: false,
    speakerRequired: false,
    hasImageFields: true,
    note: "Use this for debate scenes with a background image. Enter speaker name, topic, and side (For/Against).",
  },
};

const FIELD_LABELS: Record<ContentField, string> = {
  heading: "Heading override",
  subheading: "Subheading",
  body: "Body text",
  footer: "Footer label",
};

const FIELD_PLACEHOLDERS: Record<ContentField, string> = {
  heading: "Scene title appears here",
  subheading: "Optional supporting line",
  body: "Main message for this scene.",
  footer: "Optional small label",
};

const STANCE_OPTIONS = [
  { value: "for", label: "For" },
  { value: "against", label: "Against" },
];

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
  const config = SCENE_TYPE_CONFIG[type] ?? SCENE_TYPE_CONFIG.welcome;
  const creatableTypes = useMemo(
    () => SCENE_TYPES.filter((item) => item.creatable),
    [],
  );

  return (
    <>
      {scene ? <input type="hidden" name="sceneId" value={scene.id} /> : null}
      
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Field label="Scene type">
            <small className="mb-1 block text-xs uppercase tracking-[0.2em] text-mist-500">
              The form adapts to the type you pick
            </small>
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
        </div>
        <Field label="Scene title">
          <Input
            name="title"
            required
            defaultValue={scene?.title ?? ""}
            placeholder="Scene title"
          />
        </Field>
      </div>

      {config.usesSpeaker ? (
        <div>
          <Field
            label="Speaker"
            hint={
              config.speakerRequired
                ? "Required for this scene type."
                : "Optional for this scene type."
            }
          >
            <Select name="speakerId" defaultValue={scene?.speaker?.id ?? ""}>
              <option value="">No speaker selected</option>
              {speakers.map((speaker) => (
                <option key={speaker.id} value={speaker.id}>
                  {speaker.fullName}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      ) : null}

      {config.hasImageFields ? (
        <div className="border-l-2 border-gold-500/30 pl-4">
          <p className="mb-3 flex items-start gap-2 text-xs leading-relaxed text-mist-400">
            <HelpCircle className="mt-0.5 h-3 w-3 shrink-0 text-gold-400" />
            For image-based debate scenes, enter the speaker name (who is arguing), the topic (debate subject), and the side they're arguing.
          </p>
          
          <div className="space-y-4">
            <Field label="Speaker name (optional)">
              <Input
                name="speakerName"
                defaultValue={scene?.imageOverrides?.speakerName ?? ""}
                placeholder="Name shown on screen"
              />
            </Field>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Topic">
                <Input
                  name="topic"
                  defaultValue={scene?.imageOverrides?.topic ?? ""}
                  placeholder="Debate topic"
                />
              </Field>
              
              <Field label="Side/Stance">
                <Select
                  name="stance"
                  defaultValue={scene?.imageOverrides?.stance ?? ""}
                >
                  <option value="">Select side</option>
                  {STANCE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>
        </div>
      ) : null}

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

      {config.contentFields.length > 0 ? (
        <div className="space-y-4">
          {config.contentFields.map((field) => (
            <Field key={field} label={FIELD_LABELS[field]}>
              {field === "body" ? (
                <Textarea
                  name={field}
                  defaultValue={scene?.content[field] ?? ""}
                  placeholder={FIELD_PLACEHOLDERS[field]}
                  className="min-h-28"
                />
              ) : field === "heading" && config.hasImageFields ? (
                <Input
                  name={field}
                  defaultValue={scene?.content[field] ?? scene?.title ?? ""}
                  placeholder={FIELD_PLACEHOLDERS[field]}
                />
              ) : (
                <Input
                  name={field}
                  defaultValue={scene?.content[field] ?? ""}
                  placeholder={FIELD_PLACEHOLDERS[field]}
                />
              )}
            </Field>
          ))}
        </div>
      ) : null}

      {config.note ? (
        <div className="flex items-start gap-2 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 text-xs leading-relaxed text-mist-400">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-500/70" />
          {config.note}
        </div>
      ) : null}
    </>
  );
}