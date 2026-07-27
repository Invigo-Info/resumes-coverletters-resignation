import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Next.js 16 renamed `middleware` → `proxy`. This gates every (matched) route
// behind an Auth.js (NextAuth) session. We only check for the presence of the
// session cookie here (a lightweight route gate); the JWT itself is verified
// server-side by `auth()`. Cookie name: `authjs.session-token` on http,
// `__Secure-authjs.session-token` on https (may be chunked with a `.N` suffix).
function hasSession(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some(
      (c) =>
        c.name === "authjs.session-token" ||
        c.name.startsWith("authjs.session-token.") ||
        c.name === "__Secure-authjs.session-token" ||
        c.name.startsWith("__Secure-authjs.session-token.")
    );
}

/** The sign-in entry. Signed-in users are bounced away from these. */
function isAuthEntry(pathname: string): boolean {
  return pathname === "/login" || pathname.startsWith("/login/");
}

/**
 * Routes reachable while signed out. Beyond the sign-in entry this covers the
 * marketing landing (`/`, which itself branches on the session), the legal
 * pages, and the SEO files — none of which a crawler or logged-out visitor can
 * authenticate for, so gating them would break search indexing and the funnel.
 */
function isPublic(pathname: string): boolean {
  return (
    isAuthEntry(pathname) ||
    pathname === "/" ||
    pathname === "/terms" ||
    pathname === "/privacy" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  );
}

/**
 * Route gate (Next.js 16 "proxy", formerly middleware): redirect signed-in users
 * away from /login and bounce signed-out users on protected routes to /login.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authed = hasSession(request);

  // Signed in but visiting the sign-in entry → send to the home onboarding.
  // Only the auth entry triggers this; other public routes (/, /terms, …) must
  // still render for signed-in users, so they are excluded here to avoid a loop.
  if (authed && isAuthEntry(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Signed out and visiting a protected route → go to /login.
  if (!authed && !isPublic(pathname)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

/** Proxy matcher config: which paths the route gate runs on. */
export const config = {
  // Run on everything except API routes, Next internals, and static assets
  // (images/fonts), so CSS/JS and the public/ illustration keep loading.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
