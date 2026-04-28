import { NextRequest } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized, badRequest, forbidden } from "@/lib/session";
import { parseAndValidateDataUrl } from "@/lib/imageUpload";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

async function ensureDir() {
  await mkdir(UPLOAD_DIR, { recursive: true });
}

export async function GET(req: NextRequest) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const bookingId = req.nextUrl.searchParams.get("bookingId");
  const homeId = req.nextUrl.searchParams.get("homeId");
  if (!bookingId && !homeId) return badRequest("bookingId or homeId required");

  if (bookingId) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { customerId: true, techId: true },
    });
    if (!booking) return Response.json([]);
    if (booking.customerId !== user.id && booking.techId !== user.id && user.role !== "tech") {
      return forbidden();
    }
  } else if (homeId) {
    const home = await prisma.home.findUnique({
      where: { id: homeId },
      select: { customerId: true },
    });
    if (!home) return Response.json([]);
    if (home.customerId !== user.id && user.role !== "tech") {
      return forbidden();
    }
  }

  const photos = await prisma.photo.findMany({
    where: bookingId ? { bookingId } : { homeId: homeId! },
    orderBy: { uploadedAt: "desc" },
  });
  return Response.json(photos);
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const body = (await req.json()) as {
    bookingId?: string;
    homeId?: string;
    dataUrl?: string;
    label?: string;
    type?: string;
  };

  if (!body.dataUrl) return badRequest("dataUrl required");
  if (!body.bookingId && !body.homeId) return badRequest("bookingId or homeId required");

  if (body.bookingId) {
    const booking = await prisma.booking.findUnique({
      where: { id: body.bookingId },
      select: { customerId: true, techId: true },
    });
    if (!booking) return Response.json({ error: "Booking not found" }, { status: 404 });
    if (booking.customerId !== user.id && booking.techId !== user.id && user.role !== "tech") {
      return forbidden();
    }
  }
  if (body.homeId) {
    const home = await prisma.home.findUnique({
      where: { id: body.homeId },
      select: { customerId: true },
    });
    if (!home) return Response.json({ error: "Home not found" }, { status: 404 });
    if (home.customerId !== user.id && user.role !== "tech") return forbidden();
  }

  const parsed = parseAndValidateDataUrl(body.dataUrl);
  if (!parsed.ok) return badRequest(parsed.message);

  await ensureDir();
  const filename = `${randomUUID()}.${parsed.data.ext}`;
  await writeFile(path.join(UPLOAD_DIR, filename), parsed.data.buffer);

  const photo = await prisma.photo.create({
    data: {
      bookingId: body.bookingId ?? null,
      homeId: body.homeId ?? null,
      url: `/uploads/${filename}`,
      label: body.label ?? null,
      type: body.type ?? "before",
    },
  });

  return Response.json(photo, { status: 201 });
}
