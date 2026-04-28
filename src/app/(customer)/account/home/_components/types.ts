// Shared types + constants for the customer Home Profile page and its sub-components.

export type Priority = "high" | "medium" | "low";
export type PartStatus = "Purchased" | "Needs Purchase" | "Tech to Purchase" | null;

export interface DemoTodoItem {
  id: string;
  task: string;
  priority: Priority;
  hasPhoto: boolean;
  status: "needs-parts" | "pending" | "confirmed" | "in-progress" | "scheduled";
  parts: string | null;
  partStatus: PartStatus;
  specialist: boolean;
  notes?: string;
}

export interface HomeRecord {
  id: string;
  address: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  notes: string | null;
  gateCode: string | null;
  wifiName: string | null;
  wifiPassword: string | null;
  yearBuilt: number | null;
  waterHeaterYear: number | null;
  panelAmps: number | null;
}

export interface MemberRecord {
  id: string;
  homeId: string;
  name: string;
  role: string | null;
  phone: string | null;
}

export interface TodoRecord {
  id: string;
  homeId: string;
  task: string;
  priority: string;
  status: string;
  parts: string | null;
  partStatus: string | null;
  specialist: boolean | null;
  hasPhoto: boolean | null;
  notes: string | null;
}

export interface NoteRecord {
  id: string;
  homeId: string;
  title: string;
  body: string | null;
  severity: string | null;
  authorName: string | null;
  createdAt: string | null;
}

export interface BookingRecord {
  id: string;
  status: string;
  scheduledDate: string;
  durationMinutes: number | null;
  tech: { id: string; name: string; avatarUrl: string | null } | null;
  tasks: { id: string; label: string; done: boolean | null }[];
  reviews: { id: string; rating: number }[];
}

export interface HomeFull extends HomeRecord {
  householdMembers: MemberRecord[];
  todos: TodoRecord[];
  techNotes: NoteRecord[];
  bookings: BookingRecord[];
}

export const PRIORITY_CONFIG: Record<Priority, { dot: string; label: string; ring: string }> = {
  high: { dot: "bg-error", label: "High", ring: "ring-error/20" },
  medium: { dot: "bg-warning", label: "Medium", ring: "ring-warning/20" },
  low: { dot: "bg-text-tertiary", label: "Low", ring: "ring-border" },
};

export function formatVisitDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatHours(minutes: number | null): string {
  if (!minutes) return "—";
  const h = Math.round((minutes / 60) * 10) / 10;
  return `${h}h`;
}

export function formatNoteDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function fmtAddress(h: { address: string; city: string | null; state: string | null; zip: string | null }): string {
  const parts = [h.address];
  const cityState = [h.city, h.state].filter(Boolean).join(", ");
  if (cityState) parts.push(cityState);
  if (h.zip) parts.push(h.zip);
  return parts.join(", ");
}
