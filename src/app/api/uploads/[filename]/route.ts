import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized, notFound, forbidden } from "@/lib/session";
import { canAccessBooking, canAccessHome } from "@/lib/resource-access";

const MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
};

export async function GET(
  req: Request,
  ctx: { params: Promise<{ filename: string }> },
) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { filename } = await ctx.params;
  if (!/^[a-zA-Z0-9-]+\.(?:jpe?g|png|webp|gif|mp4|mov|webm)$/.test(filename)) return notFound("Image not found");

  const candidateUrls = [`/api/uploads/${filename}`, `/uploads/${filename}`];
  const [photo, avatarOwner, messagePhoto] = await Promise.all([
    prisma.photo.findFirst({ where: { url: { in: candidateUrls } } }),
    prisma.user.findFirst({
      where: { OR: candidateUrls.map((url) => ({ avatarUrl: { startsWith: url } })) },
      select: { id: true },
    }),
    prisma.message.findFirst({
      where: { type: "photo", text: { in: candidateUrls } },
      select: {
        conversation: {
          select: { customerId: true, techId: true },
        },
      },
    }),
  ]);

  if (!photo && !avatarOwner && !messagePhoto) return notFound("Image not found");
  if (photo?.homeId) {
    const home = await prisma.home.findUnique({ where: { id: photo.homeId }, select: { customerId: true } });
    if (!home) return notFound("Image not found");
    if (!(await canAccessHome(user, { ...home, id: photo.homeId }))) return forbidden();
    if (photo.bookingId) {
      const booking = await prisma.booking.findUnique({
        where: { id: photo.bookingId },
        select: { customerId: true, techId: true, homeId: true },
      });
      if (
        !booking ||
        booking.homeId !== photo.homeId ||
        booking.customerId !== home.customerId
      ) {
        return notFound("Image not found");
      }
      if (!canAccessBooking(user, booking)) return forbidden();
    }
  } else if (photo?.bookingId) {
    const booking = await prisma.booking.findUnique({
      where: { id: photo.bookingId },
      select: { customerId: true, techId: true },
    });
    if (!booking) return notFound("Image not found");
    if (!canAccessBooking(user, booking)) return forbidden();
  } else if (photo && !user.isAdmin) {
    return forbidden();
  }
  if (
    messagePhoto &&
    messagePhoto.conversation.customerId !== user.id &&
    messagePhoto.conversation.techId !== user.id
  ) {
    return forbidden();
  }

  const storagePath = path.join(process.cwd(), "storage", "uploads", filename);
  const legacyPath = path.join(process.cwd(), "public", "uploads", filename);
  let filePath = storagePath;
  let metadata = await stat(storagePath).catch(() => null);
  if (!metadata?.isFile()) {
    filePath = legacyPath;
    metadata = await stat(legacyPath).catch(() => null);
  }
  if (!metadata?.isFile()) return notFound("Image not found");

  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  const baseHeaders: Record<string, string> = {
    "Content-Type": MIME_TYPES[extension] ?? "application/octet-stream",
    "Cache-Control": "private, max-age=3600",
    "X-Content-Type-Options": "nosniff",
    "Accept-Ranges": "bytes",
  };

  const size = metadata.size;
  // Range support matters for video: iOS Safari refuses to play <video>
  // sources served without partial-content responses, and seeking needs it
  // everywhere. Files stream from disk instead of being buffered per request.
  const rangeHeader = req.headers.get("range");
  if (rangeHeader) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
    const startRaw = match?.[1] ?? "";
    const endRaw = match?.[2] ?? "";
    if (!match || (!startRaw && !endRaw)) {
      return new Response(null, {
        status: 416,
        headers: { ...baseHeaders, "Content-Range": `bytes */${size}` },
      });
    }
    const start = startRaw ? Number(startRaw) : Math.max(0, size - Number(endRaw));
    const end = startRaw && endRaw ? Math.min(Number(endRaw), size - 1) : size - 1;
    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) {
      return new Response(null, {
        status: 416,
        headers: { ...baseHeaders, "Content-Range": `bytes */${size}` },
      });
    }
    const stream = Readable.toWeb(
      createReadStream(filePath, { start, end }),
    ) as unknown as ReadableStream;
    return new Response(stream, {
      status: 206,
      headers: {
        ...baseHeaders,
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Content-Length": String(end - start + 1),
      },
    });
  }

  const stream = Readable.toWeb(createReadStream(filePath)) as unknown as ReadableStream;
  return new Response(stream, {
    headers: { ...baseHeaders, "Content-Length": String(size) },
  });
}
