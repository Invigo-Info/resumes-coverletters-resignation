import { handlers } from "@/features/authentication/auth";

// NextAuth catch-all route: delegates all auth requests (sign-in, callback,
// session, sign-out) to the GET/POST handlers configured in @/features/authentication/auth.
export const { GET, POST } = handlers;
