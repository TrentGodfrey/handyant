import { NextRequest } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized, badRequest } from "@/lib/session";
import {
  imageRequestExceedsLimit,
  parseAndValidateDataUrl,
} from "@/lib/imageUpload";
import { rateLimited, takeRateLimit } from "@/lib/rate-limit";
import { withUploadQuota } from "@/lib/upload-quota";
import {
  deleteLocalUploadFiles,
  getLocalUploadFilename,
} from "@/lib/upload-storage";

const UPLOAD_DIR = path.join(process.cwd(), "storage", "uploads");

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return unauthorized();
  if (imageRequestExceedsLimit(req)) {
    return Response.json({ error: "Image request is too large" }, { status: 413 });
  }
  const limit = takeRateLimit(`avatar:${user.id}`, 10, 24 * 60 * 60 * 1000);
  if (!limit.allowed) return rateLimited(limit.retryAfterSeconds);

  const body = (await req.json()) as { dataUrl?: string };
  if (!body.dataUrl) return badRequest("dataUrl required");

  const parsed = parseAndValidateDataUrl(body.dataUrl);
  if (!parsed.ok) return badRequest(parsed.message);

  const existing = await prisma.user.findUnique({
    where: { id: user.id },
    select: { avatarUrl: true },
  });
  const filename = `avatar-${user.id}-${randomUUID()}.${parsed.data.ext}`;
  const stored = await withUploadQuota({
    accountId: user.id,
    incomingBytes: parsed.data.buffer.byteLength,
    replacingUrls: existing?.avatarUrl ? [existing.avatarUrl] : [],
    write: async () => {
      await mkdir(UPLOAD_DIR, { recursive: true });
      await writeFile(path.join(UPLOAD_DIR, filename), parsed.data.buffer);
    },
  });
  if (!stored.ok) {
    return Response.json({ error: stored.message }, { status: 413 });
  }

  // Cache-bust by appending timestamp to URL
  const url = `/api/uploads/${filename}?v=${Date.now()}`;
  let updated;
  try {
    updated = await prisma.user.update({
      where: { id: user.id },
      data: { avatarUrl: url },
      select: { id: true, avatarUrl: true },
    });
  } catch (error) {
    await deleteLocalUploadFiles([url]);
    throw error;
  }
  if (
    existing?.avatarUrl &&
    getLocalUploadFilename(existing.avatarUrl) !== getLocalUploadFilename(url)
  ) {
    await deleteLocalUploadFiles([existing.avatarUrl]);
  }

  return Response.json(updated);
}
