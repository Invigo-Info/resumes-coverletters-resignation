import type { NextConfig } from "next";
import path from "node:path";

/**
 * Baseline security headers applied to every route. These are the safe,
 * app-agnostic ones (clickjacking, MIME sniffing, referrer leakage, feature
 * access, HSTS). A full script-src Content-Security-Policy is intentionally NOT
 * set here: it needs per-request nonces via middleware and would otherwise break
 * Next's inline hydration scripts and libraries like framer-motion / tiptap.
 * `frame-ancestors 'none'` gives clickjacking protection without that risk; a
 * nonce-based CSP is a tracked follow-up.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
];

const nextConfig: NextConfig = {
  // Pin the workspace root to this project (a stray lockfile in the home dir
  // otherwise makes Next infer the wrong root).
  turbopack: {
    root: path.resolve(__dirname),
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
