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
  "/terms",
  "/privacy",
  "/api/availability",
  "/api/home-invitations",
  "/api/webhooks/square",
];
const publicExact = new Set(["/"]);

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Reporting and online-payment screens are intentionally retired while MCQ
  // runs scheduling, memberships, and billing directly with customers.
  if (pathname === "/reports") return NextResponse.redirect(new URL("/dashboard", req.url));
  if (pathname === "/account/receipts" || pathname === "/account/plans") {
    return NextResponse.redirect(new URL("/account", req.url));
  }
  if (/^\/jobs\/[^/]+\/invoice$/.test(pathname)) {
    return NextResponse.redirect(new URL(pathname.replace(/\/invoice$/, ""), req.url));
  }

  // Demo mode bypass - runs FIRST so the cookie is set even when landing on
  // a public path like / or /demo. Available in production as a "Try the demo"
  // feature. The cookie only bypasses page-level proxy auth; API mutation
  // routes still require a real JWT via requireUser()/requireTech(), so demo
  // visitors can browse but can't write to the real DB. Pages gate mutations
  // client-side via useDemoMode() to keep the UX seamless.
  const demoQuery = req.nextUrl.searchParams.get("demo") === "true";
  const demoCookie = req.cookies.get("demo_mode")?.value === "true";

  if (demoQuery && !demoCookie) {
    // Set the cookie on the response. Whether the destination is public or
    // protected, we just continue - the rest of the middleware lets demo
    // requests through anyway.
    const res = NextResponse.next();
    res.cookies.set("demo_mode", "true", {
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: "lax",
    });
    return res;
  }

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
    /\.(png|jpg|jpeg|svg|webp|gif|ico)$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  // Demo cookie present - bypass auth on protected routes too
  if (demoCookie) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const isApi = pathname.startsWith("/api/");

  if (!token) {
    // API requests get a real 401 JSON response so the client-side fetch
    // doesn't follow a redirect into an HTML login page and choke on r.json().
    if (isApi) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin routes require tech role
  const adminPaths = ["/dashboard", "/schedule", "/jobs", "/homes", "/people", "/admin-messages", "/reports", "/settings"];
  if (adminPaths.some((p) => pathname.startsWith(p)) && token.role !== "tech") {
    if (isApi) {
      return new NextResponse(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "content-type": "application/json" },
      });
    }
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
