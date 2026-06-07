/**
 * Centralized demo data for HandyAnt.
 *
 * Demo customer/tech identities used across the customer + admin views when
 * the `demo_mode` cookie is set. Individual screens may extend these base
 * objects with screen-specific fields (status, tasks, etc.); the canonical
 * name/email/phone/address values live here so they stay in sync.
 */

export interface DemoCustomer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string;
  city: string;
  state: string;
  zip: string;
  initials: string;
}

export interface DemoTech {
  id: string;
  name: string;
  initials: string;
  phone: string;
  email: string;
}

export interface DemoBooking {
  id: string;
  customerId: string;
  date: string;
  time: string;
  durationMinutes: number;
  status: "confirmed" | "pending" | "needs-parts" | "scheduled" | "in-progress" | "completed";
  tasks: string[];
  estimate: string;
}

export interface DemoInvoice {
  id: string;
  number: string;
  customerId: string;
  date: string;
  dueDate: string;
  subtotal: number;
  tax: number;
  total: number;
}

// ─── Customers ─────────────────────────────────────────────────────────────

export const DEMO_CUSTOMERS: DemoCustomer[] = [
  {
    id: "1",
    name: "Sarah Mitchell",
    email: "sarah.mitchell@gmail.com",
    phone: "(972) 555-0142",
    address: "4821 Oak Hollow Dr",
    city: "Plano",
    state: "TX",
    zip: "75024",
    initials: "SM",
  },
  {
    id: "2",
    name: "Robert Chen",
    email: null,
    phone: "(469) 555-0298",
    address: "1205 Elm Creek Ct",
    city: "Frisco",
    state: "TX",
    zip: "75034",
    initials: "RC",
  },
  {
    id: "3",
    name: "Maria Garcia",
    email: null,
    phone: "(817) 555-0377",
    address: "890 Sunset Ridge",
    city: "Roanoke",
    state: "TX",
    zip: "76262",
    initials: "MG",
  },
  {
    id: "4",
    name: "James Wilson",
    email: null,
    phone: null,
    address: "2200 Heritage Trail",
    city: "McKinney",
    state: "TX",
    zip: "75070",
    initials: "JW",
  },
  {
    id: "5",
    name: "Angela Torres",
    email: null,
    phone: null,
    address: "1100 Prairie Creek",
    city: "Waxahachie",
    state: "TX",
    zip: "75165",
    initials: "AT",
  },
];

// ─── Tech ──────────────────────────────────────────────────────────────────

export const DEMO_TECH: DemoTech = {
  id: "tech-1",
  name: "Anthony Bell",
  initials: "AB",
  phone: "(972) 555-0100",
  email: "anthony@handyant.com",
};

// Some legacy screens (rate flow) display a different surname for the tech.
// Kept here to centralize the alias rather than duplicate the string inline.
export const DEMO_TECH_LEGACY_NAME = "Anthony Torres";

// ─── Bookings ──────────────────────────────────────────────────────────────

export const DEMO_BOOKINGS: DemoBooking[] = [
  {
    id: "1",
    customerId: "1",
    date: "Today",
    time: "9:00 AM",
    durationMinutes: 120,
    status: "confirmed",
    tasks: ["Replace kitchen faucet", "Fix garage door sensor"],
    estimate: "$340",
  },
  {
    id: "2",
    customerId: "2",
    date: "Today",
    time: "11:30 AM",
    durationMinutes: 90,
    status: "confirmed",
    tasks: ["Install smart thermostat", "Replace 3 outlets"],
    estimate: "$280",
  },
  {
    id: "3",
    customerId: "3",
    date: "Today",
    time: "2:00 PM",
    durationMinutes: 120,
    status: "pending",
    tasks: ["Drywall repair (2 holes)", "Touch-up paint"],
    estimate: "$190",
  },
];

// ─── Invoices ──────────────────────────────────────────────────────────────

export const DEMO_INVOICES: DemoInvoice[] = [
  {
    id: "inv-1",
    number: "INV-2026-031",
    customerId: "1",
    date: "Mar 29, 2026",
    dueDate: "Apr 5, 2026",
    subtotal: 340,
    tax: 28.05,
    total: 368.05,
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────

export function demoCustomerBy(idOrName: string): DemoCustomer | undefined {
  const needle = idOrName.toLowerCase();
  return DEMO_CUSTOMERS.find(
    (c) => c.id === idOrName || c.name.toLowerCase() === needle,
  );
}
