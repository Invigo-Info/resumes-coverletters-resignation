import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Next.js 16 renamed `middleware` → `proxy`. This gates every (matched) route
// behind an Auth.js (NextAuth) session.
//
// The gate VERIFIES the session JWT rather than merely noticing that a cookie
// exists. Presence alone was trivially forgeable: setting a cookie named
// `authjs.session-token` to any value at all got a visitor past the gate and
// rendered the authenticated page shells. No user data leaked - every API route
// and server component independently calls `auth()` - but a stranger could walk
// the whole signed-in surface, which is not a thing to leave standing.
//
// `getToken` decrypts and validates the JWE with AUTH_SECRET, so a forged or
// tampered cookie now fails here. It runs on the Edge runtime, unlike `auth()`
// itself, which pulls in bcrypt and cannot run in a proxy.
async function hasSession(request: NextRequest): Promise<boolean> {
  // Auth.js picks the cookie name by scheme and uses that same name as the
  // decryption salt, so both must match what the server issued or every valid
  // session would be rejected.
  const secureCookie =
    request.nextUrl.protocol === "https:" ||
    request.headers.get("x-forwarded-proto") === "https";
  const cookieName = secureCookie
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";

  try {
    const token = await getToken({
      req: request,
      secret: process.env.AUTH_SECRET,
      salt: cookieName,
      cookieName,
      secureCookie,
    });
    return Boolean(token);
  } catch {
    // A malformed or undecryptable cookie is not a session. Treating the error
    // as "signed out" sends the visitor to /login, which is the safe direction:
    // the alternative, failing open, is the bug we are removing.
    return false;
  }
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
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authed = await hasSession(request);

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
