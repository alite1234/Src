"use client";

import { useMemo, useState } from "react";
import { HelpCircle, Info } from "lucide-react";

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
  requiresContentBuilder?: boolean;
};

const SCENE_TYPE_CONFIG: Record<SceneType, SceneTypeConfig> = {
  opening: {
    contentFields: ["heading", "subheading", "body"],
    usesSpeaker: false,
    speakerRequired: false,
    note: "Date, venue and summit branding come from the summit settings automatically.",
    requiresContentBuilder: true,
  },
  welcome: {
    contentFields: ["heading", "body", "footer"],
    usesSpeaker: false,
    speakerRequired: false,
    requiresContentBuilder: true,
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
    requiresContentBuilder: true,
  },
  topic: {
    contentFields: ["heading", "subheading", "body"],
    usesSpeaker: false,
    speakerRequired: false,
    requiresContentBuilder: true,
  },
  announcement: {
    contentFields: ["heading", "body", "footer"],
    usesSpeaker: false,
    speakerRequired: false,
    requiresContentBuilder: true,
  },
  countdown: {
    contentFields: ["heading", "body"],
    usesSpeaker: false,
    speakerRequired: false,
    note: "The timer itself is started from the controller's countdown controls.",
    requiresContentBuilder: true,
  },
  quiz_intro: {
    contentFields: ["heading", "body"],
    usesSpeaker: false,
    speakerRequired: false,
    note: "The game PIN appears automatically once the quiz is launched.",
    requiresContentBuilder: true,
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
    requiresContentBuilder: true,
  },
  closing: {
    contentFields: ["heading", "body"],
    usesSpeaker: false,
    speakerRequired: false,
    requiresContentBuilder: true,
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
    requiresContentBuilder: false,
  },
};

const FIELD_LABELS: Record<ContentField, string> = {
  heading: "Heading",
  subheading: "Subheading",
  body: "Main text",
  footer: "Footer",
};

const FIELD_PLACEHOLDERS: Record<ContentField, string> = {
  heading: "Title or main heading",
  subheading: "Supporting line",
  body: "Main content text",
  footer: "Small label at bottom",
};

const STANCE_OPTIONS = [
  { value: "for", label: "For" },
  { value: "against", label: "Against" },
];

function StepIndicator({ step, label }: { step: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gold-500 text-xs font-medium text-white">
        {step}
      </div>
      <span className="text-sm text-mist-300">{label}</span>
    </div>
  );
}

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
    <div className="space-y-6">
      <h4 className="font-display text-sm text-mist-400">Step 1: Choose scene type</h4>
      
      <div>
        <Field label="Scene type">
          <Select
            name="type"
            value={type}
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

      {type === "image_topic" ? (
        <>
          <h4 className="font-display text-sm text-mist-400">Step 2: Image background</h4>
          <ImageUploadField
            name="backgroundFileId"
            label="Background image"
            kind="scene_background"
            eventId={eventId}
            initialFileId={scene?.backgroundFileId ?? null}
            initialUrl={scene?.backgroundUrl}
            hint="The main visual for this debate scene"
            aspect="wide"
          />
          
          <h4 className="font-display text-sm text-mist-400">Step 3: Debate details</h4>
          <div className="border-l-2 border-gold-500/30 pl-4">
            <p className="mb-3 text-xs text-mist-400">
              Who is arguing what about this topic?
            </p>
            
            <div className="space-y-4">
              <Field label="Speaker name">
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
                    placeholder="What is being debated?"
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
        </>
      ) : (
        <>
          <h4 className="font-display text-sm text-mist-400">Step 2: Content</h4>
          
          {config.usesSpeaker ? (
            <div>
              <Field label="Speaker">
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
        </>
      )}

      <input type="hidden" name="title" defaultValue={scene?.title ?? ""} />
      
      {config.note && (
        <div className="flex items-start gap-2 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 text-xs leading-relaxed text-mist-400">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-500/70" />
          {config.note}
        </div>
      )}
    </div>
  );
}