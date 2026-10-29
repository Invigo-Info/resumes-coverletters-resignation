import type { Metadata } from "next";
import { ErrorState } from "@/components/common/error-state";

export const metadata: Metadata = {
  title: "Page not found",
  // A 404 must never be indexed - otherwise search engines keep surfacing it.
  robots: { index: false, follow: false },
};

/**
 * 404 for any URL with no matching route. Previously this fell through to the
 * Next.js default page: unbranded, no navigation back, and jarring enough that
 * users assume the product is broken rather than the link.
 */
export default function NotFound() {
  return (
    <ErrorState
      code="404"
      title="We couldn't find that page"
      message="The link may be out of date, or the page may have moved. Everything you've saved is still here."
    />
  );
}
