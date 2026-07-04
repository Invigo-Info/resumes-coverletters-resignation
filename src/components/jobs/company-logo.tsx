"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Guess a likely company domain from its display name, e.g.
 * "Apex Group" -> "apexgroup.com", "Acme Inc." -> "acme.com". Best-effort:
 * a wrong guess simply 404s and we fall back to the initial.
 */
function domainFor(company: string): string | null {
  const slug = company
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\b(inc|incorporated|llc|ltd|limited|corp|corporation)\b/g, " ")
    .replace(/[^a-z0-9]/g, "");
  return slug ? `${slug}.com` : null;
}

/**
 * A company avatar: shows the real brand logo when one can be resolved from the
 * company name (via unavatar, which aggregates Clearbit / favicon sources and
 * returns a 404 when nothing is found), otherwise the company's initial in a
 * neutral box. Used on job cards, the detail panel, and the apply gateway.
 *
 * `className` controls the box size + shape (e.g. "size-11 rounded-xl");
 * `initialClassName` tunes the fallback letter's size (default text-sm).
 */
export function CompanyLogo({
  company,
  className,
  initialClassName,
}: {
  company: string;
  className?: string;
  initialClassName?: string;
}) {
  const domain = domainFor(company);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // The detail panel reuses one instance across job selections - reset per company.
  useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [domain]);

  const initial = company.trim().charAt(0).toUpperCase() || "?";
  const showImg = Boolean(domain) && !failed;

  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden bg-secondary font-semibold text-foreground",
        className
      )}
    >
      {!loaded && (
        <span className={cn("text-sm", initialClassName)}>{initial}</span>
      )}
      {showImg && (
        <img
          src={`https://unavatar.io/${domain}?fallback=false`}
          alt=""
          aria-hidden="true"
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={cn(
            "absolute inset-0 size-full object-contain p-1 transition-opacity",
            loaded ? "opacity-100" : "opacity-0"
          )}
        />
      )}
    </span>
  );
}
