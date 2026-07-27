import "server-only";

import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { privilegedPageAccessDecision } from "@/lib/access-control";
import { authOptions } from "@/lib/auth";
import {
  revalidateSessionUser,
  type SessionUser,
} from "@/lib/session";

export async function requirePrivilegedPage({
  ownerOnly = false,
}: {
  ownerOnly?: boolean;
} = {}): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  const currentUser = session?.user
    ? await revalidateSessionUser(session)
    : null;
  const demoMode = (await cookies()).get("demo_mode")?.value === "true";
  const decision = privilegedPageAccessDecision({
    hasSession: Boolean(session?.user),
    currentUser,
    demoMode,
    ownerOnly,
  });

  switch (decision) {
    case "allow":
      return currentUser;
    case "allow_demo":
      return null;
    case "password_change":
      redirect("/account/manage?password=required");
    case "customer_home":
      redirect("/home");
    case "staff_home":
      redirect("/dashboard");
    case "expired":
      redirect("/login?expired=1");
    case "login":
      redirect("/login");
  }
}
