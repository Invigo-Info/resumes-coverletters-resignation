import type { CLTemplate } from "@/lib/cover-letter/templates";

/**
 * A generated cover-letter thumbnail — a true-to-layout A4 mini preview drawn
 * from the template's own preset (accent + header layout), so each Style in the
 * carousel shows an actual cover letter rather than a reused resume image.
 */
export function CoverLetterThumb({ template }: { template: CLTemplate }) {
  const { accent, layout } = template.preset;
  const muted = "#cbd5e1";
  const faint = "#9ca3af";

  // Body paragraph lines (varied widths + paragraph gaps).
  const lines: { y: number; w: number }[] = [];
  let y = layout === "split" ? 96 : 104;
  for (let i = 0; i < 16 && y < 280; i++) {
    const last = i % 5 === 4;
    lines.push({ y, w: last ? 96 : 174 });
    y += last ? 16 : 11;
  }

  return (
    <svg viewBox="0 0 210 297" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
      <rect width="210" height="297" fill="#ffffff" />

      {layout === "split" ? (
        <>
          {/* Name (left, large) */}
          <rect x="18" y="30" width="96" height="15" rx="2.5" fill={accent} />
          <rect x="18" y="51" width="58" height="6" rx="1.5" fill={accent} opacity="0.55" />
          {/* Contact (right, stacked) */}
          <rect x="150" y="32" width="42" height="4" rx="1" fill={faint} />
          <rect x="156" y="41" width="36" height="4" rx="1" fill={faint} />
          <rect x="162" y="50" width="30" height="4" rx="1" fill={faint} />
        </>
      ) : (
        <>
          {/* Contact line (top) */}
          <rect x="18" y="26" width="120" height="4" rx="1" fill={faint} />
          {/* Name (accent) */}
          <rect x="18" y="38" width="116" height="13" rx="2.5" fill={accent} />
          <rect x="18" y="56" width="52" height="5" rx="1.5" fill={faint} />
          {/* Accent rule */}
          <rect x="18" y="70" width="174" height="2.5" rx="1" fill={accent} />
        </>
      )}

      {/* Body lines */}
      {lines.map((l, i) => (
        <rect key={i} x="18" y={l.y} width={l.w} height="3.6" rx="1" fill={muted} />
      ))}
    </svg>
  );
}
