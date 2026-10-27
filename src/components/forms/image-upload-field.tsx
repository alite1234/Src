"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";

import { compressImage } from "@/lib/compress-image";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export function ImageUploadField({
  name,
  label,
  kind,
  eventId,
  initialFileId,
  initialUrl,
  hint,
  aspect = "square",
}: {
  name: string;
  label: string;
  kind: "speaker_photo" | "speaker_background" | "scene_background";
  eventId: string;
  initialFileId?: string | null;
  initialUrl?: string | null;
  hint?: string;
  aspect?: "square" | "wide";
}) {
  const [fileId, setFileId] = useState(initialFileId ?? "");
  const [url, setUrl] = useState(initialUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const compressed = await compressImage(file, {
        maxDimension: 1600,
        quality: 0.88,
      });
      const form = new FormData();
      form.append("file", compressed);
      form.append("eventId", eventId);
      form.append("kind", kind);
      const response = await fetch("/api/upload", {
        method: "POST",
        body: form,
      });
      const payload = (await response.json()) as {
        fileId?: string;
        url?: string;
        error?: string;
      };
      if (!response.ok || !payload.fileId) {
        throw new Error(payload.error ?? "The image could not be uploaded.");
      }
      setFileId(payload.fileId);
      setUrl(payload.url ?? "");
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "The image could not be uploaded.",
      );
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function clear() {
    setFileId("");
    setUrl("");
    setError(null);
  }

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <input type="hidden" name={name} value={fileId} />
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "relative overflow-hidden rounded-xl border border-white/10 bg-navy-950/60",
            aspect === "square" ? "h-24 w-24" : "h-24 w-40",
          )}
        >
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-mist-600">
              <ImagePlus className="h-6 w-6" />
            </div>
          )}
          {busy ? (
            <div className="absolute inset-0 flex items-center justify-center bg-navy-950/70">
              <Loader2 className="h-5 w-5 animate-spin text-gold-400" />
            </div>
          ) : null}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="block w-full text-xs text-mist-400 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs file:text-mist-200 hover:file:bg-white/15"
            onChange={onSelect}
            disabled={busy}
          />
          {url ? (
            <Button type="button" variant="ghost" size="sm" onClick={clear}>
              <Trash2 className="h-3.5 w-3.5" />
              Remove image
            </Button>
          ) : null}
          {hint ? <p className="text-xs text-mist-600">{hint}</p> : null}
          {error ? <p className="text-xs text-red-300">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
