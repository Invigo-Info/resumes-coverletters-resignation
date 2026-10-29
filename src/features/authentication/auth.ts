import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { verifyCredentials } from "@/services/database/users";
import { peek, limit, reset } from "@/permissions/rate-limit";

// Brute-force throttle for email/password sign-in: after this many FAILED
// attempts for one email within the window, further attempts are refused until
// the window rolls over. Only failures count; a success clears the counter.
const LOGIN_LIMIT = Number(process.env.LOGIN_RATE_LIMIT ?? 5);
const LOGIN_WINDOW_MS = 15 * 60_000; // 15 minutes

// Auth providers. Email/password is always available; Google is added below
// only when its OAuth env vars are present.
const providers: NextAuthConfig["providers"] = [
  Credentials({
    name: "Email",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    authorize: async (creds) => {
      const email = typeof creds?.email === "string" ? creds.email : "";
      const password = typeof creds?.password === "string" ? creds.password : "";
      if (!email || !password) return null;

      // Refuse before hitting the store once an email has too many recent
      // failures - this is the brute-force / credential-stuffing brake. Uses the
      // shared store (Upstash/KV) when configured, so the cap holds across
      // serverless instances; otherwise per-instance in-memory.
      const key = `login:${email.trim().toLowerCase()}`;
      if (await peek(key, LOGIN_LIMIT)) return null;

      const user = await verifyCredentials(email, password);
      if (!user) {
        await limit(key, LOGIN_LIMIT, LOGIN_WINDOW_MS); // record the failure
        return null;
      }
      await reset(key); // success resets the counter
      return { id: user.id, email: user.email, name: user.name };
    },
  }),
];

// Only enable Google once OAuth credentials are configured, so the app still
// runs (with email/password) before they're added.
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      // Kept false, but be clear about what it does here: NOTHING. Auth.js
      // only consults this flag on the database-adapter path, and
      // handle-login.js returns early with `if (!adapter) return {...}` - this
      // app uses JWT sessions with no adapter, so the flag is never read. The
      // real guard is the `email_verified` check in the signIn callback below.
      // It stays set so that adding an adapter later cannot silently switch
      // auto-linking on.
      allowDangerousEmailAccountLinking: false,
      // Always show the Google "Choose an account" screen, even when the user
      // already has an active Google session (otherwise it silently re-auths).
      authorization: { params: { prompt: "select_account" } },
    })
  );
}

// NextAuth instance: JWT sessions, custom /login page, and callbacks that carry
// the sign-in provider + live name updates onto the session.
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  trustHost: true,
  // Send the session cookie only over HTTPS in production (the `__Secure-`
  // prefix + Secure flag). NextAuth already marks it httpOnly + sameSite=lax;
  // this makes the secure flag explicit rather than relying on host detection.
  useSecureCookies: process.env.NODE_ENV === "production",
  callbacks: {
    /**
     * Refuse an OAuth sign-in whose email the provider has not verified.
     *
     * This is the check that actually protects existing accounts. Documents,
     * subscriptions and saved jobs are all keyed by EMAIL, so whoever signs in
     * with an address owns that account's data. If a provider handed us an
     * address it had not confirmed, anyone could claim any user's account by
     * putting their email in a provider profile.
     *
     * Google sets `email_verified` on its OIDC profile and it is true for both
     * gmail.com and Workspace domains, so a legitimate Google user is never
     * blocked. Treating a MISSING flag as unverified is the deliberate choice:
     * failing closed on an unexpected profile shape is the safe direction.
     */
    async signIn({ account, profile }) {
      if (!account || account.type === "credentials") return true;
      const verified = (profile as { email_verified?: unknown } | undefined)
        ?.email_verified;
      if (verified === true) return true;
      console.warn(
        `[auth] refused ${account.provider} sign-in: email not verified by provider`
      );
      return false;
    },

    // Remember which provider signed the user in (shown on the account page),
    // and let `useSession().update({ name })` refresh the display name live.
    async jwt({ token, account, trigger, session }) {
      if (account?.provider) token.provider = account.provider;
      if (
        trigger === "update" &&
        session &&
        typeof (session as { name?: unknown }).name === "string"
      ) {
        token.name = (session as { name: string }).name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (typeof token.provider === "string") session.user.provider = token.provider;
        if (typeof token.name === "string") session.user.name = token.name;
      }
      return session;
    },
  },
});

/** Whether Google sign-in is configured (read by the login page via an API). */
export const isGoogleEnabled =
  !!process.env.AUTH_GOOGLE_ID && !!process.env.AUTH_GOOGLE_SECRET;
