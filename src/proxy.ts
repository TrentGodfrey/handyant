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
  // Restricted to non-production builds; in prod the demo flag is ignored so
  // unauthenticated traffic always falls through to the JWT check below.
  // NOTE: this only bypasses page-level proxy auth. API routes use their own
  // requireUser()/requireTech() guards which never consult the demo cookie.
  if (process.env.NODE_ENV !== "production") {
    const isDemo =
      req.nextUrl.searchParams.get("demo") === "true" ||
      req.cookies.get("demo_mode")?.value === "true";

    if (isDemo) {
      const res = NextResponse.next();
      // Set cookie so demo persists across page navigations
      res.cookies.set("demo_mode", "true", { path: "/", maxAge: 60 * 60 }); // 1 hour
      return res;
    }
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
