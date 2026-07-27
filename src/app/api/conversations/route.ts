import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized, badRequest, forbidden, verificationRequired } from "@/lib/session";
import { isUniqueConstraintError } from "@/lib/data-integrity";

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();

  const where = user.role === "tech" ? { techId: user.id } : { customerId: user.id };
  const convos = await prisma.conversation.findMany({
    where,
    include: {
      customer: { select: { id: true, name: true, avatarUrl: true, lastSeenAt: true } },
      tech: { select: { id: true, name: true, avatarUrl: true, lastSeenAt: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, text: true, type: true, createdAt: true, senderId: true, read: true },
      },
      _count: {
        select: {
          messages: {
            where: { senderId: { not: user.id }, read: false },
          },
        },
      },
    },
    orderBy: { lastMessageAt: "desc" },
  });

  const enriched = convos.map((c: typeof convos[number]) => {
    const lastMessage = c.messages[0] ?? null;
    return {
      id: c.id,
      customer: c.customer,
      tech: c.tech,
      lastMessage,
      lastMessageAt: c.lastMessageAt,
      unreadCount: c._count.messages,
    };
  });

  return Response.json(enriched);
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return unauthorized();
  if (user.role === "customer" && !user.emailVerified) return verificationRequired();

  const body = await req.json();
  if (!body.otherUserId) return badRequest("otherUserId required");
  if (body.firstMessage !== undefined) {
    return badRequest("Create the conversation before sending its first message");
  }

  const [me, other] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id } }),
    prisma.user.findUnique({ where: { id: body.otherUserId } }),
  ]);

  if (!me || !other) return Response.json({ error: "User not found" }, { status: 404 });
  if (
    me.id === other.id ||
    me.role === other.role ||
    !["customer", "tech"].includes(me.role) ||
    !["customer", "tech"].includes(other.role)
  ) {
    return badRequest("Conversations must be between a customer and a staff member");
  }

  const customerId = me.role === "customer" ? me.id : other.id;
  const techId = me.role === "tech" ? me.id : other.id;
  if (user.role === "tech" && !user.isAdmin) {
    const assignedCustomer = await prisma.booking.findFirst({
      where: { customerId, techId: user.id },
      select: { id: true },
    });
    if (!assignedCustomer) return forbidden();
  }

  const existing = await prisma.conversation.findFirst({
    where: { customerId, techId },
  });

  if (existing) return Response.json(existing);

  let convo;
  try {
    convo = await prisma.conversation.create({
      data: { customerId, techId },
    });
  } catch (error) {
    // A unique customer/staff constraint closes the race between the first
    // lookup and create. If another request won, return that conversation.
    if (isUniqueConstraintError(error)) {
      const raced = await prisma.conversation.findFirst({ where: { customerId, techId } });
      if (raced) return Response.json(raced);
    }
    throw error;
  }

  return Response.json(convo, { status: 201 });
}
