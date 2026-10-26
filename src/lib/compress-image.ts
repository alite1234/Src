"use client";

export async function compressImage(
  file: File,
  {
    maxDimension = 1600,
    quality = 0.88,
    keepUnder = 1_400_000,
  }: { maxDimension?: number; quality?: number; keepUnder?: number } = {},
): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  const scale = Math.min(
    1,
    maxDimension / Math.max(bitmap.width, bitmap.height),
  );

  if (scale === 1 && file.size <= keepUnder) {
    bitmap.close();
    return file;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return file;
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const preferredType =
    file.type === "image/jpeg" ? "image/jpeg" : "image/webp";

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, preferredType, quality);
  });

  if (!blob) return file;
  if (blob.size >= file.size && file.size <= 2_300_000) return file;

  const extension = blob.type === "image/jpeg" ? "jpg" : "webp";
  const base = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${base}.${extension}`, { type: blob.type });
}
