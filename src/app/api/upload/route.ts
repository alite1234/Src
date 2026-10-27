import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getApiUser } from "@/lib/auth/guards";
import { MAX_LOGOS } from "@/lib/constants";
import { db } from "@/lib/db";
import {
  eventLogos,
  events,
  files,
  type FileRecord,
} from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import {
  publicFileUrl,
  sha256Hex,
  toBase64,
  validateImageBuffer,
} from "@/lib/files";
import { checkRateLimit } from "@/lib/rate-limit";
import { publishEventUpdate } from "@/lib/realtime/server";
import { AUDIT_ACTIONS } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOGO_KINDS = new Set(["logo", "speaker_photo", "speaker_background", "scene_background"]);

class UploadError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function POST(request: Request) {
  const user = await getApiUser(["admin"]);
  if (!user) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }

  const limit = await checkRateLimit(`upload:${user.id}`, 60, 60);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many uploads. Please wait a moment." },
      { status: 429 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "The upload could not be read." },
      { status: 400 },
    );
  }

  const fileEntry = form.get("file");
  const eventId = String(form.get("eventId") ?? "");
  const kind = String(form.get("kind") ?? "");

  if (!(fileEntry instanceof File)) {
    return NextResponse.json(
      { error: "Please choose an image to upload." },
      { status: 400 },
    );
  }
  if (!eventId || !/^[0-9a-f-]{36}$/i.test(eventId)) {
    return NextResponse.json(
      { error: "A valid summit is required." },
      { status: 400 },
    );
  }
  if (!LOGO_KINDS.has(kind)) {
    return NextResponse.json(
      { error: "Unsupported upload type." },
      { status: 400 },
    );
  }

  try {
    const [event] = await db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);
    if (!event) throw new UploadError("The summit could not be found.", 404);

    const buffer = Buffer.from(await fileEntry.arrayBuffer());
    const validation = validateImageBuffer(buffer, fileEntry.type);
    if (!validation.ok) throw new UploadError(validation.error);
    if (kind === "logo" && validation.detected === "image/svg+xml") {
      throw new UploadError("SVG logos are not supported.");
    }

    const hash = sha256Hex(buffer);
    const rawName = String(form.get("name") ?? "").trim();
    const baseName =
      rawName ||
      fileEntry.name.replace(/\.[^.]+$/, "").trim() ||
      (kind === "logo"
        ? "Summit logo"
        : kind === "scene_background"
          ? "Scene background"
          : "Speaker image");
    const name = baseName.slice(0, 80);

    if (kind === "logo") {
      const result = await db.transaction(async (tx) => {
        await tx.execute(
          sql`select id from events where id = ${eventId} for update`,
        );

        const existing = await tx
          .select({
            logoId: eventLogos.id,
            displayOrder: eventLogos.displayOrder,
            sha256: files.sha256,
          })
          .from(eventLogos)
          .innerJoin(files, eq(eventLogos.fileId, files.id))
          .where(eq(eventLogos.eventId, eventId));

        if (existing.some((row) => row.sha256 === hash)) {
          throw new UploadError("That logo has already been uploaded.", 409);
        }
        if (existing.length >= MAX_LOGOS) {
          throw new UploadError(
            `A summit can have at most ${MAX_LOGOS} logos. Remove one before uploading another.`,
            409,
          );
        }

        const [stored] = await tx
          .insert(files)
          .values({
            eventId,
            kind,
            filename: fileEntry.name || `${name}.png`,
            mime: validation.detected,
            sizeBytes: buffer.length,
            sha256: hash,
            data: toBase64(buffer),
          })
          .returning();

        const displayOrder =
          existing.reduce((max, row) => Math.max(max, row.displayOrder), -1) +
          1;

        const [logo] = await tx
          .insert(eventLogos)
          .values({
            eventId,
            fileId: stored.id,
            name,
            displayOrder,
            isPrimary: existing.length === 0,
          })
          .returning();

        return { file: stored, logo };
      });

      await logAudit({
        eventId,
        userId: user.id,
        action: AUDIT_ACTIONS.logoAdded,
        details: { name, fileId: result.file.id },
      });
      await publishEventUpdate(eventId);

      return NextResponse.json({
        ok: true,
        fileId: result.file.id,
        logoId: result.logo.id,
        url: publicFileUrl(result.file.id),
      });
    }

    const [stored]: FileRecord[] = await db
      .insert(files)
      .values({
        eventId,
        kind,
        filename: fileEntry.name || `${name}.png`,
        mime: validation.detected,
        sizeBytes: buffer.length,
        sha256: hash,
        data: toBase64(buffer),
      })
      .returning();

    return NextResponse.json({
      ok: true,
      fileId: stored.id,
      url: publicFileUrl(stored.id),
    });
  } catch (error) {
    if (error instanceof UploadError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("Upload failed", error);
    return NextResponse.json(
      { error: "The image could not be stored. Please try again." },
      { status: 500 },
    );
  }
}
