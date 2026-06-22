import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { verifyCredentials } from "@/lib/users";

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
      const user = await verifyCredentials(email, password);
      return user ? { id: user.id, email: user.email, name: user.name } : null;
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
      allowDangerousEmailAccountLinking: true,
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
  callbacks: {
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
