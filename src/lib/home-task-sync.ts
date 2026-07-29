import type { Prisma } from "@/generated/prisma/client";
import { ACTIVE_HOME_ASSIGNMENT_STATUSES } from "@/lib/access-control";

type HomeTaskSnapshot = {
  task: string;
  description: string | null;
  notes: string | null;
  status: string;
};

type HomeTaskChanges = Record<string, unknown>;

/**
 * Booking tasks intentionally keep a small snapshot of a home task. Only
 * propagate fields whose home-task source was part of this request so an
 * unrelated edit cannot overwrite booking-specific task changes.
 */
export function linkedBookingTaskSnapshotPatch(
  homeTask: HomeTaskSnapshot,
  changes: HomeTaskChanges,
): Prisma.TaskUpdateManyMutationInput {
  const data: Prisma.TaskUpdateManyMutationInput = {};

  if (Object.prototype.hasOwnProperty.call(changes, "task")) {
    data.label = homeTask.task;
  }
  if (
    Object.prototype.hasOwnProperty.call(changes, "notes") ||
    Object.prototype.hasOwnProperty.call(changes, "description")
  ) {
    data.notes = homeTask.notes ?? homeTask.description;
  }
  if (Object.prototype.hasOwnProperty.call(changes, "status")) {
    data.done = homeTask.status === "completed";
  }

  return data;
}

/**
 * Keep tasks attached to an upcoming/active visit aligned with their source
 * home task. Completed and cancelled visits are immutable history.
 */
export async function syncLinkedActiveBookingTasks(
  tx: Pick<Prisma.TransactionClient, "task">,
  homeTodoId: string,
  homeTask: HomeTaskSnapshot,
  changes: HomeTaskChanges,
): Promise<number> {
  const data = linkedBookingTaskSnapshotPatch(homeTask, changes);
  if (Object.keys(data).length === 0) return 0;

  const updated = await tx.task.updateMany({
    where: {
      homeTodoId,
      booking: {
        status: { in: [...ACTIVE_HOME_ASSIGNMENT_STATUSES] },
      },
    },
    data,
  });
  return updated.count;
}

export function isPrismaTransactionConflict(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2034"
  );
}
