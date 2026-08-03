"use client";

import { useDocumentsStore } from "@/lib/store/documents-store";
import { usePaywall } from "@/lib/cover-letter/paywall";
import { FREE_RESUME_LIMIT } from "@/permissions/limits";

export { FREE_RESUME_LIMIT };

/**
 * Reactive free-tier resume-cap state for components. Free accounts may keep at
 * most FREE_RESUME_LIMIT saved resumes; premium accounts are unlimited. Use
 * `atLimit` to gate "create a new resume" entry points (route to /payment).
 */
export function useResumeLimit() {
  const count = useDocumentsStore((s) => s.resumes.length);
  const premium = usePaywall((s) => s.premium);
  const atLimit = !premium && count >= FREE_RESUME_LIMIT;
  return {
    count,
    premium,
    limit: FREE_RESUME_LIMIT,
    atLimit,
    remaining: Math.max(0, FREE_RESUME_LIMIT - count),
  };
}
