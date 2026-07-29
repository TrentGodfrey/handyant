import { NextRequest } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import { unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import {
  requireUser,
  unauthorized,
  badRequest,
  forbidden,
  passwordChangeRequired,
  verificationRequired,
} from "@/lib/session";
import {
  MAX_VIDEO_REQUEST_BYTES,
  imageRequestExceedsLimit,
  parseAndValidateDataUrl,
  validateMediaBuffer,
} from "@/lib/imageUpload";
import { rateLimited, takeRateLimit } from "@/lib/rate-limit";
import { canAccessBooking, canAccessHome } from "@/lib/resource-access";
import { withUploadQuota } from "@/lib/upload-quota";

const UPLOAD_DIR = path.join(process.cwd(), "storage", "uploads");

async function ensureDir() {
  await mkdir(UPLOAD_DIR, { recursive: true });
}

export async function GET(req: NextRequest) {
  const user = await requireUser();
  if (!user) return unauthorized();
  if (user.role === "tech" && user.mustChangePassword) return passwordChangeRequired();

  const bookingId = req.nextUrl.searchParams.get("bookingId");
  const homeId = req.nextUrl.searchParams.get("homeId");
  if (!bookingId && !homeId) return badRequest("bookingId or homeId required");

  let bookingHomeId: string | null = null;
  let bookingCustomerId: string | null = null;
  if (bookingId) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { customerId: true, techId: true, homeId: true },
    });
    if (!booking) return Response.json([]);
    if (!canAccessBooking(user, booking)) return forbidden();
    bookingHomeId = booking.homeId;
    bookingCustomerId = booking.customerId;
  }
  if (homeId) {
    const home = await prisma.home.findUnique({
      where: { id: homeId },
      select: { id: true, customerId: true },
    });
    if (!home) return Response.json([]);
    if (!(await canAccessHome(user, home))) return forbidden();
    if (
      bookingId &&
      (bookingHomeId !== homeId || bookingCustomerId !== home.customerId)
    ) {
      return badRequest("Booking and home do not match");
    }
  }

  const photos = await prisma.photo.findMany({
    where: bookingId
      ? { bookingId, ...(homeId ? { homeId } : {}) }
      : { homeId: homeId! },
    orderBy: { uploadedAt: "desc" },
  });
  return Response.json(photos);
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return unauthorized();
  if (user.role === "tech" && user.mustChangePassword) return passwordChangeRequired();
  if (user.role === "customer" && !user.emailVerified) return verificationRequired();

  // Videos arrive as multipart/form-data (base64 JSON would inflate them by a
  // third); photos keep the original JSON data-URL contract.
  const isMultipart = (req.headers.get("content-type") ?? "").includes("multipart/form-data");
  if (isMultipart) {
    const declaredLength = Number(req.headers.get("content-length") ?? "0");
    if (Number.isFinite(declaredLength) && declaredLength > MAX_VIDEO_REQUEST_BYTES) {
      return Response.json({ error: "Upload is too large" }, { status: 413 });
    }
  } else if (imageRequestExceedsLimit(req)) {
    return Response.json({ error: "Image request is too large" }, { status: 413 });
  }
  const limit = takeRateLimit(`photo:${user.id}`, 30, 60 * 60 * 1000);
  if (!limit.allowed) return rateLimited(limit.retryAfterSeconds);

  let body: {
    bookingId?: string;
    homeId?: string;
    dataUrl?: string;
    label?: string;
    type?: string;
  };
  let uploadedFile: File | null = null;
  if (isMultipart) {
    const form = await req.formData().catch(() => null);
    if (!form) return badRequest("Invalid upload");
    const file = form.get("file");
    if (!(file instanceof File)) return badRequest("file required");
    uploadedFile = file;
    const field = (name: string) => {
      const value = form.get(name);
      return typeof value === "string" && value ? value : undefined;
    };
    body = {
      bookingId: field("bookingId"),
      homeId: field("homeId"),
      label: field("label"),
      type: field("type"),
    };
  } else {
    body = (await req.json()) as typeof body;
    if (!body.dataUrl) return badRequest("dataUrl required");
  }

  if (!body.bookingId && !body.homeId) return badRequest("bookingId or homeId required");
  if (body.label && body.label.trim().length > 120) return badRequest("Photo caption is too long");

  if (user.role !== "tech") {
    const photoCount = await prisma.photo.count({
      where: {
        OR: [
          { home: { customerId: user.id } },
          { booking: { customerId: user.id } },
        ],
      },
    });
    if (photoCount >= 300) {
      return Response.json(
        { error: "Photo storage limit reached. Delete older photos or contact MCQ." },
        { status: 413 },
      );
    }
  }

  let bookingHomeId: string | null = null;
  let storageAccountId: string | null = null;
  if (body.bookingId) {
    const booking = await prisma.booking.findUnique({
      where: { id: body.bookingId },
      select: { customerId: true, techId: true, homeId: true },
    });
    if (!booking) return Response.json({ error: "Booking not found" }, { status: 404 });
    if (!canAccessBooking(user, booking)) return forbidden();
    bookingHomeId = booking.homeId;
    storageAccountId = booking.customerId;
  }
  if (body.homeId) {
    const home = await prisma.home.findUnique({
      where: { id: body.homeId },
      select: { id: true, customerId: true },
    });
    if (!home) return Response.json({ error: "Home not found" }, { status: 404 });
    if (!(await canAccessHome(user, home))) return forbidden();
    if (storageAccountId && storageAccountId !== home.customerId) {
      return badRequest("Booking customer and home owner do not match");
    }
    storageAccountId = home.customerId;
    if (body.bookingId && bookingHomeId !== body.homeId) {
      return badRequest("Booking and home do not match");
    }
  }
  if (!storageAccountId) return badRequest("Photo owner could not be determined");

  let uploadBuffer: Buffer;
  let uploadExt: string;
  if (uploadedFile) {
    uploadBuffer = Buffer.from(await uploadedFile.arrayBuffer());
    const media = validateMediaBuffer(uploadBuffer);
    if (!media.ok) return badRequest(media.message);
    uploadExt = media.data.ext;
  } else {
    const parsed = parseAndValidateDataUrl(body.dataUrl!);
    if (!parsed.ok) return badRequest(parsed.message);
    uploadBuffer = parsed.data.buffer;
    uploadExt = parsed.data.ext;
  }

  const filename = `${randomUUID()}.${uploadExt}`;
  const filePath = path.join(UPLOAD_DIR, filename);
  const stored = await withUploadQuota({
    accountId: storageAccountId,
    incomingBytes: uploadBuffer.byteLength,
    write: async () => {
      await ensureDir();
      await writeFile(filePath, uploadBuffer);
    },
  });
  if (!stored.ok) {
    return Response.json({ error: stored.message }, { status: 413 });
  }

  const allowedTypes = new Set(["before", "after", "general"]);
  const photoType = body.type && allowedTypes.has(body.type) ? body.type : "general";
  let photo;
  try {
    photo = await prisma.photo.create({
      data: {
        bookingId: body.bookingId ?? null,
        homeId: body.homeId ?? null,
        url: `/api/uploads/${filename}`,
        label: body.label?.trim() || null,
        type: photoType,
      },
    });
  } catch (error) {
    await unlink(filePath).catch(() => undefined);
    throw error;
  }

  return Response.json(photo, { status: 201 });
}
