import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

const publicPaths = [
  "/login",
  "/signup",
  "/api/auth",
  "/onboarding",
  "/demo",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/api/availability",
];
const publicExact = new Set(["/"]);

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths and static assets
  if (
    publicExact.has(pathname) ||
    publicPaths.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/icon" ||
    pathname === "/apple-icon" ||
    pathname.startsWith("/icon-") ||
    pathname.startsWith("/uploads/") ||
    /\.(png|jpg|jpeg|svg|webp|gif|ico)$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  // Demo mode bypass — allow browsing with ?demo=true or demo cookie.
  // Available in production as a "Try the demo" feature. The cookie only
  // bypasses page-level proxy auth; API mutation routes still require a real
  // JWT via requireUser()/requireTech(), so demo visitors can browse but
  // can't write to the real DB. Pages gate mutations client-side via
  // useDemoMode() to keep the UX seamless.
  const isDemo =
    req.nextUrl.searchParams.get("demo") === "true" ||
    req.cookies.get("demo_mode")?.value === "true";

  if (isDemo) {
    const res = NextResponse.next();
    // Persist for 7 days so users can come back to explore
    res.cookies.set("demo_mode", "true", {
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
    });
    return res;
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin routes require tech role
  const adminPaths = ["/dashboard", "/schedule", "/jobs", "/homes", "/people", "/admin-messages", "/reports", "/settings"];
  if (adminPaths.some((p) => pathname.startsWith(p)) && token.role !== "tech") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
