import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { verifyCredentials } from "@/lib/users";

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
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  trustHost: true,
});

/** Whether Google sign-in is configured (read by the login page via an API). */
export const isGoogleEnabled =
  !!process.env.AUTH_GOOGLE_ID && !!process.env.AUTH_GOOGLE_SECRET;
