import { readFile } from "node:fs/promises";
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
};

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ filename: string }> },
) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { filename } = await ctx.params;
  if (!/^[a-zA-Z0-9-]+\.(?:jpe?g|png|webp|gif)$/.test(filename)) return notFound("Image not found");

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
  let data: Buffer;
  try {
    data = await readFile(storagePath);
  } catch {
    try {
      data = await readFile(legacyPath);
    } catch {
      return notFound("Image not found");
    }
  }

  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  return new Response(new Blob([new Uint8Array(data)]), {
    headers: {
      "Content-Type": MIME_TYPES[extension] ?? "application/octet-stream",
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
