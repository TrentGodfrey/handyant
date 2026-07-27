import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { processDueEmailReminders } from "@/lib/reminders.server";

async function main() {
  const result = await processDueEmailReminders();
  console.log(JSON.stringify({ event: "appointment-reminders", ...result }));
  if (result.failed > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error("[appointment-reminders] processor failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
