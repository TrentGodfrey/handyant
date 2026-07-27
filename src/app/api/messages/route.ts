import { NextRequest } from "next/server";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized, notFound, badRequest, verificationRequired } from "@/lib/session";
import { sendActivityEmail } from "@/lib/activity-email";
import {
  imageRequestExceedsLimit,
  parseAndValidateDataUrl,
} from "@/lib/imageUpload";
import { rateLimited, takeRateLimit } from "@/lib/rate-limit";
import { withUploadQuota } from "@/lib/upload-quota";

const UPLOAD_DIR = path.join(process.cwd(), "storage", "uploads");
const MAX_MESSAGE_LENGTH = 2_000;

export async function GET(req: NextRequest) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const userId = user.id;
  const conversationId = req.nextUrl.searchParams.get("conversationId");

  if (conversationId) {
    // Verify user is part of this conversation
    const convo = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [{ customerId: userId }, { techId: userId }],
      },
    });
    if (!convo) return notFound();

    const messages = await prisma.message.findMany({
      where: { conversationId },
      include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: "asc" },
    });

    // Mark unread messages as read
    await prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        read: false,
      },
      data: { read: true },
    });

    return Response.json(messages);
  }

  // List conversations
  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [{ customerId: userId }, { techId: userId }],
    },
    include: {
      customer: { select: { id: true, name: true, avatarUrl: true } },
      tech: { select: { id: true, name: true, avatarUrl: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { sender: { select: { id: true, name: true } } },
      },
    },
    orderBy: { lastMessageAt: "desc" },
  });

  return Response.json(conversations);
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return unauthorized();
  if (user.role === "customer" && !user.emailVerified) return verificationRequired();
  if (imageRequestExceedsLimit(req)) {
    return Response.json({ error: "Request body is too large" }, { status: 413 });
  }

  const userId = user.id;
  const body = await req.json();
  const isPhoto = body.type === "photo";
  let text = typeof body.text === "string" ? body.text.trim() : "";
  if (!body.conversationId || (!isPhoto && !text)) {
    return badRequest(isPhoto
      ? "conversationId and photo are required"
      : "conversationId and message text are required");
  }
  if (!isPhoto && text.length > MAX_MESSAGE_LENGTH) {
    return badRequest(`Message is too long (max ${MAX_MESSAGE_LENGTH} characters)`);
  }
  const limit = takeRateLimit(
    `message:${userId}:${isPhoto ? "photo" : "text"}`,
    isPhoto ? 10 : 40,
    60 * 60 * 1000,
  );
  if (!limit.allowed) return rateLimited(limit.retryAfterSeconds);

  // Verify user is part of this conversation
  const convo = await prisma.conversation.findFirst({
    where: {
      id: body.conversationId,
      OR: [{ customerId: userId }, { techId: userId }],
    },
    include: {
      customer: { select: { id: true, name: true, email: true } },
      tech: { select: { id: true, name: true, email: true } },
    },
  });
  if (!convo) {
    return Response.json({ error: "Conversation not found" }, { status: 404 });
  }

  let uploadedPath: string | null = null;
  if (isPhoto) {
    if (typeof body.dataUrl !== "string") return badRequest("Photo data is required");
    const parsed = parseAndValidateDataUrl(body.dataUrl);
    if (!parsed.ok) return badRequest(parsed.message);
    const filename = `${randomUUID()}.${parsed.data.ext}`;
    uploadedPath = path.join(UPLOAD_DIR, filename);
    const stored = await withUploadQuota({
      accountId: userId,
      incomingBytes: parsed.data.buffer.byteLength,
      write: async () => {
        await mkdir(UPLOAD_DIR, { recursive: true });
        await writeFile(uploadedPath!, parsed.data.buffer);
      },
    });
    if (!stored.ok) {
      return Response.json({ error: stored.message }, { status: 413 });
    }
    text = `/api/uploads/${filename}`;
  }

  let message;
  try {
    message = await prisma.message.create({
      data: {
        conversationId: body.conversationId,
        senderId: userId,
        text,
        type: isPhoto ? "photo" : "text",
      },
      include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
    });
  } catch (error) {
    if (uploadedPath) await unlink(uploadedPath).catch(() => undefined);
    throw error;
  }

  // Update conversation's lastMessageAt
  await prisma.conversation.update({
    where: { id: body.conversationId },
    data: { lastMessageAt: new Date() },
  });

  const recipient = userId === convo.customerId ? convo.tech : convo.customer;
  await sendActivityEmail({
    to: recipient.email,
    recipientName: recipient.name,
    subject: `New MCQ message from ${message.sender.name ?? "your contact"}`,
    heading: "You have a new message",
    message: isPhoto ? "A photo was shared with you in MCQ Property Care." : text,
    actionPath: recipient.id === convo.techId ? `/admin-messages?customerId=${convo.customerId}` : "/messages",
    actionLabel: "Reply in MCQ",
  });

  return Response.json(message, { status: 201 });
}
