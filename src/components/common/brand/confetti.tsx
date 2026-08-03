"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * A brief, decorative celebration burst - confetti pieces falling across the
 * viewport. Colors come from the theme's chart tokens (var(--chart-*)) so the
 * burst stays on-brand and themeable; no hardcoded hex and no emoji (a hard
 * rule). Purely presentational: pointer-events-none + aria-hidden, and it
 * renders nothing when the user prefers reduced motion.
 *
 * Mount it to play (each piece animates once on mount); unmount it after ~1.6s
 * to clean up. Wrap in a truthy guard so it fires on the moment worth
 * celebrating rather than on every render.
 */
const CONFETTI_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--primary)",
];

export function Confetti({ count = 36 }: { count?: number }) {
  const reduce = useReducedMotion() ?? false;
  if (reduce) return null;
  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
      aria-hidden
    >
      {Array.from({ length: count }).map((_, i) => {
        const left = (i * 37) % 100;
        const xDrift = ((i % 5) - 2) * 34;
        return (
          <motion.span
            key={i}
            className="absolute top-0 size-2 rounded-sm"
            style={{
              left: `${left}%`,
              backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            }}
            initial={{ y: -24, opacity: 1, rotate: 0 }}
            animate={{ y: "100vh", x: xDrift, opacity: [1, 1, 0], rotate: 540 }}
            transition={{ duration: 1.6, delay: (i % 6) * 0.05, ease: "easeIn" }}
          />
        );
      })}
    </div>
  );
}
