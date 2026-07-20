export interface BookingDurationRecord {
  status: string;
  durationMinutes: number | null;
}

export function countsAsBooked(status: string): boolean {
  return status !== "cancelled";
}

export function sumBookedMinutes(bookings: BookingDurationRecord[]): number {
  return bookings.reduce(
    (total, booking) => total + (countsAsBooked(booking.status) ? booking.durationMinutes ?? 0 : 0),
    0,
  );
}
