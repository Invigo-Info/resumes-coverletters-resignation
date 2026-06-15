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

/** Routes reachable while signed out. */
function isPublic(pathname: string): boolean {
  return pathname === "/login" || pathname.startsWith("/login/");
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authed = hasSession(request);

  // Signed in but visiting /login → send to the home onboarding.
  if (authed && isPublic(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Signed out and visiting a protected route → go to /login.
  if (!authed && !isPublic(pathname)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except API routes, Next internals, and static assets
  // (images/fonts), so CSS/JS and the public/ illustration keep loading.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
