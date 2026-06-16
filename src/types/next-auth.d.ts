import type { DefaultSession } from "next-auth";

// Augment the session/JWT with the sign-in provider so the account page can
// show "Google" / "Email" next to the user's email.
declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id?: string;
      provider?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    provider?: string;
  }
}
