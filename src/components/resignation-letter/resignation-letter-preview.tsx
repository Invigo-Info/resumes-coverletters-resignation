"use client";

import { useResignationLetterStore, type RLFontId, type RLFontSize } from "@/lib/store/resignation-letter-store";
import { formatLetterDate, previewOpeningLine, htmlToText } from "@/lib/resignation-letter/format";
import { spaceBlocks } from "@/lib/html-spacing";
import { cn } from "@/lib/utils";

const FONT_STACK: Record<RLFontId, string> = {
  georgia: "Georgia, 'Times New Roman', serif",
  inter: "var(--font-sans), system-ui, sans-serif",
  garamond: "'EB Garamond', Garamond, Georgia, serif",
};

const SIZE_SCALE: Record<RLFontSize, number> = { S: 0.92, M: 1, L: 1.12 };

/**
 * The live resignation-letter document. `card` is the small builder side-panel
 * preview (live template); `page` is the full A4 document used on the final
 * screen (renders the generated body and is the PDF target).
 */
export function ResignationLetterPreview({ variant = "card" }: { variant?: "card" | "page" }) {
  const s = useResignationLetterStore();
  const name = s.fullName.trim() || "Your Name";
  const date = formatLetterDate(s.submissionDate) || "April 14, 2026";
  const email = s.contacts.email.trim();
  const hasBody = s.letter.body.trim().length > 0;
  const scale = SIZE_SCALE[s.design.fontSize];

  const isPage = variant === "page";
  // Dark letterhead only applies to the full document (the builder card stays light).
  const dark = isPage && s.design.theme === "dark";
  // A tinted combination fills the page and colors the letter text in the accent
  // (a monochrome letterhead look); plain combinations keep dark, readable body.
  const tinted = !dark && !!s.design.bg;
  const pageBg = dark ? "#171717" : s.design.bg || "#ffffff";
  const textColor = dark ? "#ffffff" : tinted ? s.design.accent : "#111827";
  const titleColor = dark ? "#ffffff" : s.design.accent;

  return (
    <div
      data-rl-preview={isPage ? "" : undefined}
      className={cn(
        isPage
          ? "mx-auto w-full max-w-[816px] rounded-sm px-16 py-14 shadow-card-lg ring-1"
          : "flex h-full min-h-[520px] w-full flex-col rounded-2xl px-7 py-6 shadow-card ring-1",
        dark ? "ring-neutral-800" : "ring-border"
      )}
      style={{
        fontFamily: FONT_STACK[s.design.font],
        fontSize: `${scale}rem`,
        backgroundColor: pageBg,
        color: textColor,
      }}
    >
      <h2
        className="font-bold tracking-tight"
        style={{ fontSize: isPage ? "2.2em" : "1.35em", color: titleColor }}
      >
        Resignation Letter
      </h2>
      <p className="mt-2 font-semibold" style={{ fontSize: isPage ? "1em" : "0.78em" }}>
        {name}
      </p>

      <p className="mt-4 opacity-90" style={{ fontSize: isPage ? "0.95em" : "0.72em" }}>
        {date}
      </p>

      {/* Body: generated letter once available, otherwise the live template.
          Paragraph gaps are baked inline (spaceBlocks) so they survive the PDF. */}
      {hasBody ? (
        <div
          className="mt-4 leading-relaxed"
          style={{ fontSize: isPage ? "0.95em" : "0.72em" }}
          dangerouslySetInnerHTML={{ __html: spaceBlocks(s.letter.body, 0.9) }}
        />
      ) : (
        <div className="mt-4 space-y-3" style={{ fontSize: isPage ? "0.95em" : "0.72em" }}>
          {s.salutation.trim() && (
            <p className="leading-relaxed opacity-90">{s.salutation.trim()}</p>
          )}
          <p className="leading-relaxed opacity-90">{previewOpeningLine(s.lastWorkingDay)}</p>
          {/* The seeded/edited reason + gratitude paragraphs — highlighted to show
              they update live as the user fills the builder. */}
          {htmlToText(s.reasonText).trim() && (
            <p className="leading-relaxed font-medium" style={{ color: titleColor }}>
              {htmlToText(s.reasonText).trim()}
            </p>
          )}
          {htmlToText(s.gratitudeText)
            .trim()
            .split(/\n{2,}/)
            .filter(Boolean)
            .map((para, i) => (
              <p key={`g${i}`} className="leading-relaxed font-medium" style={{ color: titleColor }}>
                {para}
              </p>
            ))}
          {s.assistance &&
            htmlToText(s.assistanceText)
              .trim()
              .split(/\n{2,}/)
              .filter(Boolean)
              .map((para, i) => (
                <p key={`a${i}`} className="leading-relaxed font-medium" style={{ color: titleColor }}>
                  {para}
                </p>
              ))}
        </div>
      )}

      <div className="flex-1" />

      {email && (
        <p className="mt-6 opacity-80" style={{ fontSize: isPage ? "0.9em" : "0.66em" }}>
          {email}
        </p>
      )}
    </div>
  );
}
