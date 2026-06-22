import { handlers } from "@/auth";

// NextAuth catch-all route: delegates all auth requests (sign-in, callback,
// session, sign-out) to the GET/POST handlers configured in @/auth.
export const { GET, POST } = handlers;
