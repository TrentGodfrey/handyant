import { prisma } from "@/lib/prisma";
import { forbidden, notFound, requireTech, unauthorized } from "@/lib/session";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const tech = await requireTech();
  if (!tech) return unauthorized();
  const { id } = await ctx.params;

  const message = await prisma.message.findUnique({
    where: { id },
    include: { conversation: { select: { id: true, techId: true } } },
  });
  if (!message) return notFound("Message not found");
  if (message.conversation.techId !== tech.id) return forbidden();

  await prisma.$transaction(async (tx) => {
    await tx.message.delete({ where: { id } });
    const latest = await tx.message.findFirst({
      where: { conversationId: message.conversationId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    await tx.conversation.update({
      where: { id: message.conversationId },
      data: { lastMessageAt: latest?.createdAt ?? null },
    });
  });

  return Response.json({ ok: true });
}
