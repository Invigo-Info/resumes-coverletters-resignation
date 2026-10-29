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
/** The two names Auth.js may have issued the session cookie under. */
const SECURE_COOKIE = "__Secure-authjs.session-token";
const PLAIN_COOKIE = "authjs.session-token";

async function hasSession(request: NextRequest): Promise<boolean> {
  // Read the name from the cookie that is ACTUALLY present, rather than
  // inferring it from the request scheme.
  //
  // Inferring was a real bug, found by the end-to-end suite. Auth.js picks the
  // name from `useSecureCookies`, which this app ties to NODE_ENV - but the
  // gate was guessing from `nextUrl.protocol` / `x-forwarded-proto`. Those two
  // disagree on any production deployment that does not surface
  // `x-forwarded-proto`: Auth.js issues `__Secure-authjs.session-token` while
  // the gate looks for `authjs.session-token`, finds nothing, and redirects
  // every signed-in user to /login. It presents as "login is broken" with a
  // valid session and nothing in the logs, which is about the worst shape a
  // production incident can take.
  //
  // The cookie name is also the JWE decryption salt, so it has to be right, not
  // merely close.
  const cookieName = request.cookies.has(SECURE_COOKIE)
    ? SECURE_COOKIE
    : PLAIN_COOKIE;

  try {
    const token = await getToken({
      req: request,
      secret: process.env.AUTH_SECRET,
      salt: cookieName,
      cookieName,
      secureCookie: cookieName === SECURE_COOKIE,
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
 * Account-recovery pages, reachable while signed out BUT not bounced away from
 * when signed in.
 *
 * Both halves matter. Someone who has forgotten their password is by definition
 * signed out, so gating these would redirect them to the login page they cannot
 * get past - the lockout this whole flow exists to fix. And a confirmation link
 * is routinely opened in a browser where the user IS signed in, so treating
 * these as sign-in entries would redirect the link away before it is consumed.
 */
function isRecovery(pathname: string): boolean {
  return (
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/verify-email"
  );
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
    isRecovery(pathname) ||
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
    // `webmanifest` is in this list because the route gate redirected
    // /manifest.webmanifest to /login: a signed-out browser, and every
    // crawler, got an HTML redirect instead of the manifest, so the install
    // prompt and the home-screen icon silently never worked. It is public by
    // definition - a browser reads it BEFORE anyone signs in. Same for the
    // .txt/.xml SEO files.
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|jpg|jpeg|gif|webp|ico|woff2?|webmanifest|txt|xml)$).*)",
  ],
};
