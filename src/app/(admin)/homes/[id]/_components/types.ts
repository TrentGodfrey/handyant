// Shared types + constants + helpers for the admin Home Detail page.

export type Priority = "high" | "medium" | "low";
export type ItemStatus = "needs-parts" | "in-progress" | "pending" | "completed";

export interface ApiTask {
  id: string;
  label: string;
  done: boolean | null;
  notes: string | null;
}

export interface ApiPart {
  id: string;
  item: string;
  qty: number | null;
  cost: string | null;
  status: string | null;
}

export interface ApiPhoto {
  id: string;
  url: string;
  label: string | null;
  type: string | null;
}

export interface ApiBooking {
  id: string;
  status: string;
  scheduledDate: string;
  scheduledTime: string;
  durationMinutes: number | null;
  description: string | null;
  techNotes: string | null;
  customerNotes: string | null;
  finalCost: string | null;
  estimatedCost: string | null;
  tasks: ApiTask[];
  parts?: ApiPart[];
  photos?: ApiPhoto[];
}

export interface ApiTodo {
  id: string;
  task: string;
  priority: string;
  status: string;
  parts: string | null;
  partStatus: string | null;
  specialist: boolean | null;
  hasPhoto: boolean | null;
  notes: string | null;
}

export interface ApiTechNote {
  id: string;
  title: string;
  body: string | null;
  severity: string | null;
  authorName: string | null;
  createdAt: string;
}

export interface ApiHome {
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
  customer: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    avatarUrl: string | null;
  };
  bookings: ApiBooking[];
  photos: ApiPhoto[];
  todos: ApiTodo[];
  techNotes: ApiTechNote[];
}

export interface EditFormState {
  address: string;
  city: string;
  state: string;
  zip: string;
  gateCode: string;
  wifiName: string;
  wifiPassword: string;
  notes: string;
  yearBuilt: string;
  waterHeaterYear: string;
  panelAmps: string;
}

export interface NormalizedTodo {
  id: string;
  task: string;
  priority: Priority;
  status: ItemStatus;
  parts: string | null;
  partStatus: string | null;
  specialist: boolean;
  hasPhoto: boolean;
}

export const priorityDot: Record<Priority, string> = {
  high: "bg-error",
  medium: "bg-warning",
  low: "bg-text-tertiary",
};

export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function formatLongDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}

export function formatShortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

export function normalizeStatus(s: string): ItemStatus {
  if (s === "completed" || s === "done") return "completed";
  if (s === "needs-parts" || s === "needs_parts") return "needs-parts";
  if (s === "in-progress" || s === "in_progress") return "in-progress";
  return "pending";
}

export function normalizePriority(p: string): Priority {
  if (p === "high" || p === "low") return p;
  return "medium";
}
