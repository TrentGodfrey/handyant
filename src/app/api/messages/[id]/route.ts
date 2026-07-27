import { prisma } from "@/lib/prisma";
import { forbidden, notFound, requireTech, unauthorized } from "@/lib/session";
import { deleteLocalUploadFiles } from "@/lib/upload-storage";

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

  // Message photo uploads use a fresh generated filename per message. Delete
  // the database record first, then clean up only a strictly validated local
  // upload path; cleanup is best-effort so a filesystem issue cannot roll
  // back or resurrect a message the staff member already deleted.
  if (message.type === "photo") {
    await deleteLocalUploadFiles([message.text]);
  }

  return Response.json({ ok: true });
}
