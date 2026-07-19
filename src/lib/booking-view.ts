export type BookingViewUser = {
  id: string;
  role: "customer" | "tech";
};

/**
 * Staff can open the customer-facing UI to preview their own customer account.
 * In that view, booking lists must be scoped by customer ownership instead of
 * returning every job assigned to the staff member.
 */
export function bookingListWhere(user: BookingViewUser, view: string | null) {
  if (user.role === "tech" && view !== "customer") {
    return { techId: user.id };
  }

  return { customerId: user.id };
}
