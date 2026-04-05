import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as Record<string, unknown>).id as string;
  const conversationId = req.nextUrl.searchParams.get("conversationId");

  if (conversationId) {
    // Verify user is part of this conversation
    const convo = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [{ customerId: userId }, { techId: userId }],
      },
    });
    if (!convo) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

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
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as Record<string, unknown>).id as string;
  const body = await req.json();

  // Verify user is part of this conversation
  const convo = await prisma.conversation.findFirst({
    where: {
      id: body.conversationId,
      OR: [{ customerId: userId }, { techId: userId }],
    },
  });
  if (!convo) {
    return Response.json({ error: "Conversation not found" }, { status: 404 });
  }

  const message = await prisma.message.create({
    data: {
      conversationId: body.conversationId,
      senderId: userId,
      text: body.text,
      type: body.type ?? "text",
    },
    include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
  });

  // Update conversation's lastMessageAt
  await prisma.conversation.update({
    where: { id: body.conversationId },
    data: { lastMessageAt: new Date() },
  });

  return Response.json(message, { status: 201 });
}
