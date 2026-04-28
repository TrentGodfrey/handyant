import { NextRequest } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized, badRequest } from "@/lib/session";
import { parseAndValidateDataUrl } from "@/lib/imageUpload";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const body = (await req.json()) as { dataUrl?: string };
  if (!body.dataUrl) return badRequest("dataUrl required");

  const parsed = parseAndValidateDataUrl(body.dataUrl);
  if (!parsed.ok) return badRequest(parsed.message);

  await mkdir(UPLOAD_DIR, { recursive: true });
  const filename = `avatar-${user.id}.${parsed.data.ext}`;
  await writeFile(path.join(UPLOAD_DIR, filename), parsed.data.buffer);

  // Cache-bust by appending timestamp to URL
  const url = `/uploads/${filename}?v=${Date.now()}`;
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { avatarUrl: url },
    select: { id: true, avatarUrl: true },
  });

  return Response.json(updated);
}
