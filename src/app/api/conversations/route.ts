import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized, badRequest } from "@/lib/session";

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();

  const where = user.role === "tech" ? { techId: user.id } : { customerId: user.id };
  const convos = await prisma.conversation.findMany({
    where,
    include: {
      customer: { select: { id: true, name: true, avatarUrl: true } },
      tech: { select: { id: true, name: true, avatarUrl: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, text: true, createdAt: true, senderId: true, read: true },
      },
    },
    orderBy: { lastMessageAt: "desc" },
  });

  const enriched = convos.map((c: typeof convos[number]) => {
    const lastMessage = c.messages[0] ?? null;
    const unreadCount = lastMessage && lastMessage.senderId !== user.id && !lastMessage.read ? 1 : 0;
    return {
      id: c.id,
      customer: c.customer,
      tech: c.tech,
      lastMessage,
      lastMessageAt: c.lastMessageAt,
      unreadCount,
    };
  });

  return Response.json(enriched);
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const body = await req.json();
  if (!body.otherUserId) return badRequest("otherUserId required");

  const [me, other] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id } }),
    prisma.user.findUnique({ where: { id: body.otherUserId } }),
  ]);

  if (!me || !other) return Response.json({ error: "User not found" }, { status: 404 });

  const customerId = me.role === "customer" ? me.id : other.id;
  const techId = me.role === "tech" ? me.id : other.id;

  const existing = await prisma.conversation.findFirst({
    where: { customerId, techId },
  });

  if (existing) return Response.json(existing);

  const convo = await prisma.conversation.create({
    data: { customerId, techId },
  });

  if (body.firstMessage) {
    await prisma.message.create({
      data: {
        conversationId: convo.id,
        senderId: user.id,
        text: body.firstMessage,
      },
    });
  }

  return Response.json(convo, { status: 201 });
}
