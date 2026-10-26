import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { files } from "@/lib/db/schema";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return new Response("Not found", { status: 404 });
  }

  const [file] = await db
    .select({
      mime: files.mime,
      data: files.data,
      sha256: files.sha256,
      filename: files.filename,
    })
    .from(files)
    .where(eq(files.id, id))
    .limit(1);

  if (!file) {
    return new Response("Not found", { status: 404 });
  }

  const buffer = Buffer.from(file.data, "base64");
  const body = new Uint8Array(buffer);

  return new Response(body, {
    headers: {
      "Content-Type": file.mime,
      "Content-Length": String(buffer.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      ETag: `"${file.sha256}"`,
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": `inline; filename="${encodeURIComponent(file.filename)}"`,
    },
  });
}
