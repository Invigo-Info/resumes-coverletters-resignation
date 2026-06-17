"use client";

import { useCoverLetterStore, type CLFontId } from "@/lib/store/cover-letter-store";
import { bodyToHtml } from "@/lib/cover-letter/format";
import { spaceBlocks } from "@/lib/html-spacing";
import { cn } from "@/lib/utils";

const FONT_STACK: Record<CLFontId, string> = {
  georgia: "Georgia, 'Times New Roman', serif",
  inter: "var(--font-sans), system-ui, sans-serif",
  garamond: "'EB Garamond', Garamond, Georgia, serif",
};

const SPACING = {
  // `em` is the inline paragraph gap baked into the body HTML so it survives the
  // PDF export (html2canvas drops class-based `space-y`/`[&_p]:mb` spacing).
  dense: { pad: "px-12 py-12", body: "leading-snug", gap: "mt-5", em: 0.65 },
  normal: { pad: "px-14 py-16", body: "leading-relaxed", gap: "mt-6", em: 1.0 },
  loose: { pad: "px-16 py-20", body: "leading-loose", gap: "mt-8", em: 1.5 },
} as const;

/**
 * A4-style cover letter document. Tagged `data-cl-preview` so the PDF exporter
 * can find the visible node. Honours the Design panel: Style layout, font,
 * spacing and the accent / tinted / dark color combinations.
 */
export function CoverLetterPreview() {
  const { personal, jobDetails, letter, design } = useCoverLetterStore();

  const fullName = `${personal.firstName} ${personal.lastName}`.trim() || "Your Name";
  const role = jobDetails.desiredJobTitle || "";
  const contacts = [personal.address, personal.phone, personal.email]
    .map((x) => x.trim())
    .filter(Boolean);

  const company = letter.companyName || jobDetails.companyName;
  const hiringManager = letter.hiringManagerName || jobDetails.hiringManagerName;
  const recipient = [hiringManager, company].filter(Boolean).join(", ");
  const dark = !!design.dark;
  const layout = design.layout ?? "accent-top";
  const sp = SPACING[design.spacing ?? "normal"];
  // Replace any leftover signature placeholder ("[Candidate's Full Name]") with
  // the real name, then bake the paragraph gap inline so it survives the PDF.
  const bodyHtml = spaceBlocks(
    bodyToHtml(letter.body || "").replace(/\[[^\]]*name[^\]]*\]/gi, fullName),
    sp.em
  );
  const pageBg = design.bg || (dark ? "#0e4b5a" : "#ffffff");
  const nameColor = dark ? "#ffffff" : design.accent;
  const ruleColor = dark ? "rgba(255,255,255,0.35)" : design.accent;
  const bodyColor = dark ? "rgba(255,255,255,0.92)" : "#1f2937";
  const subColor = dark ? "rgba(255,255,255,0.75)" : "#52525b";

  const header =
    layout === "split" ? (
      <header className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <h1
            className="text-5xl font-bold leading-[1.05] tracking-tight lowercase"
            style={{ color: nameColor }}
          >
            {fullName}
          </h1>
          {role && (
            <p className="mt-2 text-sm font-semibold" style={{ color: dark ? "#ffffff" : design.accent }}>
              {role}
            </p>
          )}
        </div>
        {contacts.length > 0 && (
          <div className="shrink-0 space-y-0.5 pt-2 text-right text-[12px]" style={{ color: subColor }}>
            {contacts.map((c) => (
              <p key={c}>{c}</p>
            ))}
          </div>
        )}
      </header>
    ) : (
      <header>
        {contacts.length > 0 && (
          <p className="text-[10px] uppercase tracking-wide" style={{ color: subColor }}>
            {contacts.join("  •  ")}
          </p>
        )}
        <h1
          className="mt-2 text-3xl font-bold uppercase tracking-wide"
          style={{ color: nameColor }}
        >
          {fullName}
        </h1>
        {role && (
          <p className="text-sm font-semibold italic" style={{ color: subColor }}>
            {role}
          </p>
        )}
        <hr className="mt-3 border-t-2" style={{ borderColor: ruleColor }} />
      </header>
    );

  return (
    <div
      data-cl-preview
      className={cn("mx-auto w-full max-w-[760px] shadow-card-lg", sp.pad)}
      style={{
        fontFamily: FONT_STACK[design.font] ?? FONT_STACK.georgia,
        minHeight: "1000px",
        backgroundColor: pageBg,
        color: bodyColor,
      }}
    >
      {header}

      {/* Body */}
      <div className={cn("text-[13px]", sp.gap, sp.body)} style={{ color: bodyColor }}>
        {recipient && <p style={{ marginBottom: `${sp.em}em` }}>{recipient}</p>}
        {bodyHtml ? (
          <div
            className="[&_li]:ml-4 [&_li]:list-disc"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        ) : (
          <p style={{ color: subColor }}>Your generated cover letter will appear here.</p>
        )}
      </div>
    </div>
  );
}
