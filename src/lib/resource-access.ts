import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/session";
import {
  ACTIVE_HOME_ASSIGNMENT_STATUSES,
  canAccessBookingResource,
  homeResourceAccessDecision,
} from "@/lib/access-control";

type ResourceUser = Pick<SessionUser, "id" | "role" | "isAdmin">;

export function canAccessBooking(
  user: ResourceUser,
  booking: { customerId: string; techId: string | null },
): boolean {
  return canAccessBookingResource(user, booking);
}

/**
 * Customers may access their own home, the owner may access every business
 * home, and ordinary technicians may access only homes tied to their assigned
 * work. This prevents a guessed home UUID from exposing another customer's
 * address, gate code, Wi-Fi credentials, photos, or task history.
 */
export async function canAccessHome(
  user: ResourceUser,
  home: { id: string; customerId: string },
): Promise<boolean> {
  const decision = homeResourceAccessDecision(user, home);
  if (decision === "allow") return true;
  if (decision === "deny") return false;

  const assignedBooking = await prisma.booking.findFirst({
    where: {
      homeId: home.id,
      techId: user.id,
      status: { in: [...ACTIVE_HOME_ASSIGNMENT_STATUSES] },
    },
    select: { id: true },
  });
  return Boolean(assignedBooking);
}

export function customerRosterWhere(user: ResourceUser) {
  return {
    role: "customer" as const,
    ...(user.isAdmin
      ? {}
      : {
          bookingsAsCustomer: {
            some: {
              techId: user.id,
              status: { in: [...ACTIVE_HOME_ASSIGNMENT_STATUSES] },
            },
          },
        }),
  };
}

export function homeRosterWhere(user: ResourceUser) {
  return user.isAdmin
    ? {}
    : {
        bookings: {
          some: {
            techId: user.id,
            status: { in: [...ACTIVE_HOME_ASSIGNMENT_STATUSES] },
          },
        },
      };
}
