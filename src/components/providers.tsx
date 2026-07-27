"use client";

import { SessionProvider } from "next-auth/react";
import { AnalyticsTracker } from "@/components/analytics/analytics-tracker";

/** Wraps the app so client components can read the Auth.js session. */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <AnalyticsTracker />
    </SessionProvider>
  );
}
