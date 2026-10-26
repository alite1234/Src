import { createHash } from "node:crypto";

import { MAX_IMAGE_BYTES } from "@/lib/constants";

export const ALLOWED_IMAGE_MIME = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export function publicFileUrl(fileId: string) {
  return `/api/files/${fileId}`;
}

export function sha256Hex(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

export function isAllowedImageMime(mime: string) {
  return (ALLOWED_IMAGE_MIME as readonly string[]).includes(mime);
}

export function detectImageMime(buffer: Buffer): string | null {
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

export function validateImageBuffer(buffer: Buffer, mime: string) {
  if (buffer.length === 0) {
    return { ok: false as const, error: "The selected file is empty." };
  }
  if (buffer.length > MAX_IMAGE_BYTES) {
    return {
      ok: false as const,
      error: "Images must be smaller than 2.5 MB after compression.",
    };
  }
  if (!isAllowedImageMime(mime)) {
    return {
      ok: false as const,
      error: "Only PNG, JPEG and WebP images are supported.",
    };
  }
  const detected = detectImageMime(buffer);
  if (!detected || detected !== mime) {
    return {
      ok: false as const,
      error: "The file contents do not match a supported image format.",
    };
  }
  return { ok: true as const, detected };
}

export function toBase64(buffer: Buffer) {
  return buffer.toString("base64");
}

export function fromBase64(value: string) {
  return Buffer.from(value, "base64");
}
