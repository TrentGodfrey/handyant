import { prisma } from "@/lib/prisma";
import { sendActivityEmail } from "@/lib/activity-email";

interface HomeTaskEmailParams {
  homeId: string;
  actorRole: "customer" | "tech";
  subject: string;
  message: string;
  taskId?: string;
}

export async function sendHomeTaskEmail(params: HomeTaskEmailParams) {
  const home = await prisma.home.findUnique({
    where: { id: params.homeId },
    include: { customer: { select: { name: true, email: true } } },
  });
  if (!home) return;

  const recipient = params.actorRole === "tech"
    ? home.customer
    : await prisma.user.findFirst({
        where: { role: "tech", email: { not: null } },
        orderBy: { createdAt: "asc" },
        select: { name: true, email: true },
      });

  await sendActivityEmail({
    to: recipient?.email,
    recipientName: recipient?.name,
    subject: params.subject,
    heading: "To-do update",
    message: params.message,
    actionPath: params.taskId ? `/task/${params.taskId}` : params.actorRole === "tech" ? "/todo" : "/admin-todos",
    actionLabel: "View to-do",
  });
}
