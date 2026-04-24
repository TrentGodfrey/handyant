import { NextRequest } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized, badRequest } from "@/lib/session";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
};

function parseDataUrl(dataUrl: string): { ext: string; buffer: Buffer } | null {
  const match = /^data:([\w/+.-]+);base64,(.+)$/i.exec(dataUrl);
  if (!match) return null;
  const mime = match[1].toLowerCase();
  const ext = MIME_EXT[mime] ?? "bin";
  const buffer = Buffer.from(match[2], "base64");
  return { ext, buffer };
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const body = (await req.json()) as { dataUrl?: string };
  if (!body.dataUrl) return badRequest("dataUrl required");

  const parsed = parseDataUrl(body.dataUrl);
  if (!parsed) return badRequest("Invalid dataUrl");

  await mkdir(UPLOAD_DIR, { recursive: true });
  const filename = `avatar-${user.id}.${parsed.ext}`;
  await writeFile(path.join(UPLOAD_DIR, filename), parsed.buffer);

  // Cache-bust by appending timestamp to URL
  const url = `/uploads/${filename}?v=${Date.now()}`;
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { avatarUrl: url },
    select: { id: true, avatarUrl: true },
  });

  return Response.json(updated);
}
