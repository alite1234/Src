"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2 } from "lucide-react";

import { compressImage } from "@/lib/compress-image";
import { MAX_LOGOS } from "@/lib/constants";

export function LogoUploader({
  eventId,
  count,
}: {
  eventId: string;
  count: number;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const full = count >= MAX_LOGOS;

  async function onSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const compressed = await compressImage(file, {
        maxDimension: 1400,
        quality: 0.9,
        keepUnder: 900_000,
      });
      const form = new FormData();
      form.append("file", compressed);
      form.append("eventId", eventId);
      form.append("kind", "logo");
      form.append("name", file.name.replace(/\.[^.]+$/, "").slice(0, 80));
      const response = await fetch("/api/upload", {
        method: "POST",
        body: form,
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "The logo could not be uploaded.");
      }
      router.refresh();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "The logo could not be uploaded.",
      );
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <label
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-6 text-center transition-colors ${
          full
            ? "pointer-events-none border-white/10 opacity-50"
            : "border-gold-500/30 bg-gold-500/[0.04] hover:border-gold-400/60 hover:bg-gold-500/[0.08]"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={onSelect}
          disabled={busy || full}
          className="sr-only"
        />
        {busy ? (
          <Loader2 className="h-5 w-5 animate-spin text-gold-400" />
        ) : (
          <ImagePlus className="h-5 w-5 text-gold-400" />
        )}
        <span className="text-xs text-mist-300">
          {full
            ? `Maximum of ${MAX_LOGOS} logos reached`
            : busy
              ? "Uploading and optimising…"
              : "Add a logo (PNG, JPEG or WebP)"}
        </span>
        <span className="text-[10px] text-mist-600">
          {count} of {MAX_LOGOS} used · larger images are compressed on your
          device
        </span>
      </label>
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
