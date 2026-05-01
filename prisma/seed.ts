import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { BookingStatus, SubscriptionPlan } from "../src/generated/prisma/enums";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

const prisma = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL!) });

async function main() {
  console.log("Seeding…");

  // Service categories
  const categories = [
    { name: "Plumbing", icon: "Droplet", sortOrder: 1 },
    { name: "Electrical", icon: "Zap", sortOrder: 2 },
    { name: "Carpentry", icon: "Hammer", sortOrder: 3 },
    { name: "Painting", icon: "PaintBucket", sortOrder: 4 },
    { name: "Drywall", icon: "Square", sortOrder: 5 },
    { name: "Appliance", icon: "Refrigerator", sortOrder: 6 },
    { name: "Outdoor", icon: "Trees", sortOrder: 7 },
    { name: "Smart Home", icon: "Wifi", sortOrder: 8 },
  ];

  for (const c of categories) {
    await prisma.serviceCategory.upsert({
      where: { name: c.name },
      update: { icon: c.icon, sortOrder: c.sortOrder },
      create: c,
    });
  }

  // Tech account (owner)
  const tech = await prisma.user.upsert({
    where: { email: "anthony@handyant.com" },
    update: {},
    create: {
      email: "anthony@handyant.com",
      passwordHash: await hash("anthony123", 12),
      name: "Anthony Bell",
      phone: "(214) 555-0199",
      role: "tech",
      emailVerified: true,
    },
  });

  await prisma.serviceArea.upsert({
    where: { techId_city: { techId: tech.id, city: "Plano" } },
    update: {},
    create: { techId: tech.id, city: "Plano" },
  });

  // Customers + homes
  const customerData: Array<{
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    zip: string;
    plan: SubscriptionPlan | null;
  }> = [
    { name: "Sarah Mitchell", email: "sarah@example.com", phone: "(972) 555-0142", address: "4821 Oak Hollow Dr", city: "Plano", zip: "75024", plan: SubscriptionPlan.pro },
    { name: "Robert Chen", email: "robert@example.com", phone: "(469) 555-0298", address: "1205 Elm Creek Ct", city: "Frisco", zip: "75034", plan: SubscriptionPlan.pro },
    { name: "Maria Garcia", email: "maria@example.com", phone: "(817) 555-0377", address: "890 Sunset Ridge", city: "Roanoke", zip: "76262", plan: null },
    { name: "James Wilson", email: "james@example.com", phone: "(214) 555-0421", address: "2200 Heritage Trail", city: "McKinney", zip: "75070", plan: null },
    { name: "Angela Torres", email: "angela@example.com", phone: "(972) 555-0188", address: "1100 Prairie Creek", city: "Waxahachie", zip: "75165", plan: SubscriptionPlan.pro },
    { name: "Derek Nguyen", email: "derek@example.com", phone: "(469) 555-0512", address: "350 Creekside Blvd", city: "Allen", zip: "75002", plan: SubscriptionPlan.pro },
  ];

  const customers: { id: string; name: string; homeId: string }[] = [];
  for (const c of customerData) {
    const user = await prisma.user.upsert({
      where: { email: c.email },
      update: {},
      create: {
        email: c.email,
        passwordHash: await hash("password123", 12),
        name: c.name,
        phone: c.phone,
        role: "customer",
        emailVerified: true,
      },
    });

    const existingHome = await prisma.home.findFirst({
      where: { customerId: user.id, address: c.address },
    });
    const home = existingHome ?? (await prisma.home.create({
      data: {
        customerId: user.id,
        address: c.address,
        city: c.city,
        state: "TX",
        zip: c.zip,
      },
    }));

    if (c.plan) {
      const existingSub = await prisma.subscription.findFirst({
        where: { customerId: user.id, status: "active" },
      });
      if (!existingSub) {
        await prisma.subscription.create({
          data: { customerId: user.id, plan: c.plan, status: "active" },
        });
      }
    }

    customers.push({ id: user.id, name: c.name, homeId: home.id });
  }

  // Wipe + reseed bookings (idempotent reseed)
  await prisma.booking.deleteMany({});

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const day = (offset: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    return d;
  };

  const time = (h: number, m = 0) => new Date(`1970-01-01T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`);

  const bookingSeeds = [
    {
      customerIdx: 0, dateOffset: 0, hour: 9, status: "confirmed", duration: 120, estimate: 340,
      desc: "Kitchen faucet + garage door sensor",
      tasks: [
        { label: "Replace kitchen faucet (Moen brushed nickel)" },
        { label: "Fix garage door sensor alignment", notes: "Laser level needed" },
        { label: "Check garbage disposal — making noise" },
      ],
      parts: [
        { item: "Moen 7594ESRS Arbor Faucet", qty: 1, status: "purchased", cost: 185 },
        { item: "Garage door sensor bracket", qty: 1, status: "needed", cost: 22 },
      ],
      categoriesByName: ["Plumbing"],
    },
    {
      customerIdx: 1, dateOffset: 0, hour: 11, minute: 30, status: "confirmed", duration: 90, estimate: 280,
      desc: "Smart thermostat + outlets",
      tasks: [
        { label: "Install Nest Learning Thermostat (3rd gen)" },
        { label: "Replace 3 duplex outlets" },
      ],
      parts: [],
      categoriesByName: ["Electrical", "Smart Home"],
    },
    {
      customerIdx: 2, dateOffset: 0, hour: 14, status: "pending", duration: 120, estimate: 190,
      desc: "Drywall + paint touch-up",
      tasks: [
        { label: "Drywall patch — 2 holes from TV mount" },
        { label: "Touch-up paint — living room & hallway", notes: "Paint color: SW Alabaster" },
      ],
      parts: [],
      categoriesByName: ["Drywall", "Painting"],
    },
    {
      customerIdx: 3, dateOffset: 4, hour: 10, status: "pending", duration: 240, estimate: 620,
      desc: "Bathroom wallpaper + tile grout",
      tasks: [{ label: "Wallpaper removal (full bathroom)" }, { label: "Tile grout repair" }],
      parts: [{ item: "Wallpaper steamer rental", qty: 1, status: "needed", cost: 35 }],
      categoriesByName: ["Painting"],
    },
    {
      customerIdx: 4, dateOffset: 5, hour: 8, minute: 30, status: "confirmed", duration: 90, estimate: 175,
      desc: "Ceiling fan + bath caulk",
      tasks: [{ label: "Ceiling fan install" }, { label: "Caulk master bath" }],
      parts: [],
      categoriesByName: ["Electrical"],
    },
    // Past completed jobs (for receipts + reviews)
    {
      customerIdx: 0, dateOffset: -16, hour: 9, status: "completed", duration: 150, estimate: 285, finalCost: 285,
      desc: "Kitchen faucet repair + garbage disposal",
      tasks: [{ label: "Replace cartridge", done: true }, { label: "Reseat disposal", done: true }],
      parts: [{ item: "Moen cartridge", qty: 1, status: "purchased", cost: 45 }],
      categoriesByName: ["Plumbing"],
      review: { rating: 5, comment: "Quick and clean." },
    },
    {
      customerIdx: 0, dateOffset: -45, hour: 13, status: "completed", duration: 90, estimate: 120, finalCost: 120,
      desc: "Smart thermostat install",
      tasks: [{ label: "Install Nest", done: true }],
      parts: [],
      categoriesByName: ["Smart Home"],
      review: { rating: 5, comment: "Perfect job." },
    },
    {
      customerIdx: 1, dateOffset: -10, hour: 11, status: "completed", duration: 180, estimate: 215, finalCost: 215,
      desc: "Garbage disposal + P-trap",
      tasks: [{ label: "Install disposal", done: true }, { label: "Fix leaky P-trap", done: true }],
      parts: [],
      categoriesByName: ["Plumbing"],
      review: { rating: 5, comment: "On time and tidy." },
    },
  ];

  for (const b of bookingSeeds) {
    const customer = customers[b.customerIdx];
    const cats = await prisma.serviceCategory.findMany({ where: { name: { in: b.categoriesByName } } });

    const booking = await prisma.booking.create({
      data: {
        customerId: customer.id,
        homeId: customer.homeId,
        techId: tech.id,
        scheduledDate: day(b.dateOffset),
        scheduledTime: time(b.hour, b.minute ?? 0),
        durationMinutes: b.duration,
        status: b.status as BookingStatus,
        description: b.desc,
        estimatedCost: b.estimate,
        finalCost: b.finalCost ?? null,
        categories: { create: cats.map((c) => ({ categoryId: c.id })) },
        tasks: { create: b.tasks.map((t, i) => { const tt = t as { label: string; notes?: string; done?: boolean }; return { label: tt.label, notes: tt.notes ?? null, done: tt.done ?? false, sortOrder: i }; }) },
        parts: { create: b.parts.map((p) => ({ item: p.item, qty: p.qty, status: p.status, cost: p.cost })) },
      },
    });

    if (b.status === "completed" && b.finalCost) {
      const number = `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
      await prisma.invoice.create({
        data: {
          bookingId: booking.id,
          customerId: customer.id,
          number,
          subtotal: b.finalCost,
          tax: 0,
          total: b.finalCost,
          status: "paid",
          sentAt: day(b.dateOffset),
          paidAt: day(b.dateOffset + 1),
        },
      });
    }

    if (b.review) {
      await prisma.review.create({
        data: {
          bookingId: booking.id,
          customerId: customer.id,
          techId: tech.id,
          rating: b.review.rating,
          comment: b.review.comment,
          categories: b.categoriesByName,
        },
      });
    }
  }

  // Conversation between Anthony and Sarah, with a couple messages
  const sarah = customers[0];
  const existingConvo = await prisma.conversation.findFirst({
    where: { customerId: sarah.id, techId: tech.id },
  });
  const convo = existingConvo ?? (await prisma.conversation.create({
    data: { customerId: sarah.id, techId: tech.id },
  }));

  const msgCount = await prisma.message.count({ where: { conversationId: convo.id } });
  if (msgCount === 0) {
    await prisma.message.create({
      data: { conversationId: convo.id, senderId: tech.id, text: "Hi Sarah! Confirming our appointment for Tuesday at 9 AM." },
    });
    await prisma.message.create({
      data: { conversationId: convo.id, senderId: sarah.id, text: "Sounds great! The kitchen faucet has been leaking worse." },
    });
    await prisma.message.create({
      data: { conversationId: convo.id, senderId: tech.id, text: "Got it — I'll bring a Moen cartridge. Brushed nickel?" },
    });
  }

  // A welcome notification for each customer
  for (const c of customers) {
    const has = await prisma.notification.findFirst({ where: { userId: c.id, title: "Welcome to MCQ Home Co." } });
    if (!has) {
      await prisma.notification.create({
        data: {
          userId: c.id,
          title: "Welcome to MCQ Home Co.",
          body: "Tap to book your first visit.",
          type: "info",
          link: "/book",
        },
      });
    }
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
