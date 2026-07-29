import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import {
  canAccessWhilePasswordChangeRequired,
  isPrivilegedSessionActive,
} from "@/lib/access-control";

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

  // MCQ manages billing directly in Square. Retire the former invoice/payment
  // APIs as well as their screens so stale links cannot revive parallel
  // revenue tracking or checkout state inside this app.
  if (
    pathname.startsWith("/api/invoices") ||
    pathname.startsWith("/api/payments") ||
    pathname === "/api/webhooks/square"
  ) {
    return NextResponse.json(
      { error: "Billing is managed directly by MCQ in Square." },
      { status: 410 },
    );
  }

  // Reporting and online-payment screens are intentionally retired while MCQ
  // runs scheduling, memberships, and billing directly with customers.
  if (pathname === "/reports") return NextResponse.redirect(new URL("/dashboard", req.url));
  if (pathname === "/account/receipts" || pathname === "/account/plans") {
    return NextResponse.redirect(new URL("/account", req.url));
  }
  if (/^\/jobs\/[^/]+\/invoice$/.test(pathname)) {
    return NextResponse.redirect(new URL(pathname.replace(/\/invoice$/, ""), req.url));
  }

  // Demo mode remains available for signed-out visitors, but a signed-in
  // temporary-password staff account must not use it to bypass the password
  // change gate.
  const demoQuery = req.nextUrl.searchParams.get("demo") === "true";
  const demoCookie = req.cookies.get("demo_mode")?.value === "true";
  const isApi = pathname.startsWith("/api/");
  const isStaticAsset =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/icon" ||
    pathname === "/apple-icon" ||
    pathname.startsWith("/icon-") ||
    (!isApi && /\.(png|jpg|jpeg|svg|webp|gif|ico)$/i.test(pathname));
  if (isStaticAsset) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const staffMustChangePassword =
    token?.role === "tech" && token.mustChangePassword === true;

  if (
    staffMustChangePassword &&
    !canAccessWhilePasswordChangeRequired(pathname)
  ) {
    if (isApi) {
      return new NextResponse(
        JSON.stringify({
          error: "Change your temporary password before continuing.",
          code: "PASSWORD_CHANGE_REQUIRED",
        }),
        {
          status: 403,
          headers: { "content-type": "application/json" },
        },
      );
    }
    return NextResponse.redirect(new URL("/account/manage?password=required", req.url));
  }

  if (staffMustChangePassword && demoCookie) {
    const res = NextResponse.next();
    res.cookies.delete("demo_mode");
    return res;
  }

  if (demoQuery && !demoCookie && !token) {
    // Redirect once so the next request carries the new cookie into Server
    // Components. Authenticated users never enter demo mode, even if they add
    // ?demo=true manually.
    const demoUrl = req.nextUrl.clone();
    demoUrl.searchParams.delete("demo");
    const res = NextResponse.redirect(demoUrl);
    res.cookies.set("demo_mode", "true", {
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
    });
    return res;
  }

  if (
    publicExact.has(pathname) ||
    publicPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  ) {
    return NextResponse.next();
  }

  // Only a signed-out demo visitor may bypass page auth. Authenticated users
  // continue through the normal role and session-expiry checks.
  if (demoCookie && !token) {
    return NextResponse.next();
  }

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
  const adminPaths = [
    "/dashboard",
    "/schedule",
    "/jobs",
    "/homes",
    "/people",
    "/admin-messages",
    "/admin-notifications",
    "/reports",
    "/settings",
  ];
  if (adminPaths.some((p) => pathname.startsWith(p)) && token.role !== "tech") {
    if (isApi) {
      return new NextResponse(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "content-type": "application/json" },
      });
    }
    return NextResponse.redirect(new URL("/home", req.url));
  }

  if (
    token.role === "tech" &&
    !isPrivilegedSessionActive({
      role: token.role,
      privilegedExpiresAt: token.privilegedExpiresAt,
    })
  ) {
    if (isApi) {
      return new NextResponse(JSON.stringify({ error: "Session expired" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }
    return NextResponse.redirect(new URL("/login?expired=1", req.url));
  }

  const ownerPaths = ["/settings"];
  if (ownerPaths.some((p) => pathname.startsWith(p)) && token.isAdmin !== true) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  // Uploads are authenticated and gated inside their Route Handlers so large
  // multipart bodies can stream directly there instead of being cloned into
  // the Proxy's in-memory request buffer.
  matcher: ["/((?!api/photos(?:/|$)|_next/static|_next/image|favicon.ico).*)"],
};
