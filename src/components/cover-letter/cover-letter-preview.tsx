"use client";

import {
  useCoverLetterStore,
  type CLFontId,
  type CoverLetterState,
} from "@/lib/store/cover-letter-store";
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

/** The letter fields the preview needs: pass a saved record to render it, or
 *  omit to render the live active cover letter from the store. */
export type CoverLetterPreviewData = Pick<
  CoverLetterState,
  "personal" | "jobDetails" | "letter" | "design"
>;

/**
 * A4-style cover letter document. Tagged `data-cl-preview` so the PDF exporter
 * can find the visible node. Renders one of nine header layouts (matching the
 * Style thumbnails) plus the chosen font, spacing, accent, and dark theme.
 * With `data` it renders that saved letter; without it, the live store letter.
 */
export function CoverLetterPreview({ data }: { data?: CoverLetterPreviewData } = {}) {
  const store = useCoverLetterStore();
  const { personal, jobDetails, letter, design } = data ?? store;

  const fullName = `${personal.firstName} ${personal.lastName}`.trim() || "Your Name";
  const role = jobDetails.desiredJobTitle || "";
  const contacts = [personal.address, personal.phone, personal.email]
    .map((x) => x.trim())
    .filter(Boolean);
  const contactLine = contacts.join("  •  ");

  const company = letter.companyName || jobDetails.companyName;
  const hiringManager = letter.hiringManagerName || jobDetails.hiringManagerName;
  const recipient = [hiringManager, company].filter(Boolean).join(", ");
  const layout = design.layout ?? "left-right";
  const sp = SPACING[design.spacing ?? "normal"];
  // Replace any leftover signature placeholder ("[Candidate's Full Name]") with
  // the real name, then bake the paragraph gap inline so it survives the PDF.
  const bodyHtml = spaceBlocks(
    bodyToHtml(letter.body || "").replace(/\[[^\]]*name[^\]]*\]/gi, fullName),
    sp.em
  );

  // The dark color swatch is a full-page dark theme, but never for the layouts
  // that already own their palette (dark sidebar / two-column meta).
  const themed = layout !== "sidebar" && layout !== "leftmeta";
  const dark = !!design.dark && themed;
  const accent = design.accent;
  const pageBg = (themed && design.bg) || (dark ? "#0e4b5a" : "#ffffff");
  const nameColor = dark ? "#ffffff" : accent;
  const ruleColor = dark ? "rgba(255,255,255,0.35)" : accent;
  const bodyColor = dark ? "rgba(255,255,255,0.92)" : "#1f2937";
  const subColor = dark ? "rgba(255,255,255,0.75)" : "#52525b";
  const fontFamily = FONT_STACK[design.font] ?? FONT_STACK.georgia;

  // Letter body (paragraphs), reused by every layout.
  const letterBody = bodyHtml ? (
    <div
      className="[&_li]:ml-4 [&_li]:list-disc"
      dangerouslySetInnerHTML={{ __html: bodyHtml }}
    />
  ) : (
    <p style={{ color: subColor }}>Your generated cover letter will appear here.</p>
  );

  // Body with the recipient line above it (the common case).
  const bodyBlock = (
    <div className={cn("text-[13px]", sp.gap, sp.body)} style={{ color: bodyColor }}>
      {recipient && <p style={{ marginBottom: `${sp.em}em` }}>{recipient}</p>}
      {letterBody}
    </div>
  );

  // ---- Full-page structural layouts ----------------------------------------

  // NEWTON: dark name/contact column on the left, letter body on the right.
  if (layout === "sidebar") {
    return (
      <div
        data-cl-preview
        className="mx-auto flex w-full max-w-[760px] overflow-hidden shadow-card-lg"
        style={{ fontFamily, minHeight: "1000px", backgroundColor: "#ffffff", color: "#1f2937" }}
      >
        <aside className="w-[34%] shrink-0 bg-neutral-900 px-8 py-16 text-white">
          <h1 className="text-3xl font-bold leading-tight tracking-tight">{fullName}</h1>
          {role && <p className="mt-1.5 text-sm text-white/70">{role}</p>}
          {contacts.length > 0 && (
            <div className="mt-8 space-y-1.5 text-[11px] leading-relaxed text-white/80">
              {contacts.map((c) => (
                <p key={c}>{c}</p>
              ))}
            </div>
          )}
        </aside>
        <div className={cn("min-w-0 flex-1", sp.pad)}>{bodyBlock}</div>
      </div>
    );
  }

  // STALLMAN: name + decorative squares up top, then a "To / From" meta column
  // beside the letter body.
  if (layout === "leftmeta") {
    return (
      <div
        data-cl-preview
        className={cn("mx-auto w-full max-w-[760px] shadow-card-lg", sp.pad)}
        style={{ fontFamily, minHeight: "1000px", backgroundColor: "#ffffff", color: "#1f2937" }}
      >
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight" style={{ color: accent }}>
              {fullName}
            </h1>
            {role && <p className="mt-1 text-sm font-semibold" style={{ color: subColor }}>{role}</p>}
          </div>
          <div className="grid shrink-0 grid-cols-3 gap-1 pt-1" aria-hidden>
            {Array.from({ length: 9 }).map((_, i) => (
              <span
                key={i}
                className="size-2"
                style={{ backgroundColor: (i * 7) % 3 === 0 ? accent : "#d4d4d8" }}
              />
            ))}
          </div>
        </div>
        <div className="mt-10 flex gap-8">
          <div className="w-[26%] shrink-0 text-[11px] leading-relaxed" style={{ color: subColor }}>
            {recipient && (
              <>
                <p className="font-bold uppercase tracking-wide" style={{ color: accent }}>To</p>
                <p className="mt-0.5">{recipient}</p>
              </>
            )}
            <p className="mt-4 font-bold uppercase tracking-wide" style={{ color: accent }}>From</p>
            <p className="mt-0.5">{fullName}</p>
          </div>
          <div className={cn("min-w-0 flex-1 text-[13px]", sp.body)} style={{ color: bodyColor }}>
            {letterBody}
          </div>
        </div>
      </div>
    );
  }

  // ---- Single-column header layouts ----------------------------------------

  const nameCls = "text-4xl font-bold tracking-tight";
  let header: React.ReactNode;

  if (layout === "contacts") {
    // SHAKESPEARE / FORD: name left, then a labelled "Contacts" block.
    header = (
      <header>
        <h1 className={nameCls} style={{ color: nameColor }}>{fullName}</h1>
        {role && <p className="mt-1 text-sm font-semibold" style={{ color: subColor }}>{role}</p>}
        {contactLine && (
          <>
            <h2 className="mt-5 text-base font-bold" style={{ color: nameColor }}>Contacts</h2>
            <p className="mt-1 text-[12px]" style={{ color: subColor }}>{contactLine}</p>
          </>
        )}
      </header>
    );
  } else if (layout === "centered") {
    // NAPOLEON: everything centred, rule under.
    header = (
      <header className="text-center">
        <h1 className={nameCls} style={{ color: nameColor }}>{fullName}</h1>
        {role && <p className="mt-1.5 text-sm font-semibold" style={{ color: subColor }}>{role}</p>}
        {contactLine && <p className="mt-2.5 text-[12px]" style={{ color: subColor }}>{contactLine}</p>}
        <hr className="mt-4 border-t" style={{ borderColor: ruleColor }} />
      </header>
    );
  } else if (layout === "stars") {
    // AMPERE: centred with a diamond divider.
    header = (
      <header className="text-center">
        <h1 className={nameCls} style={{ color: nameColor }}>{fullName}</h1>
        {role && <p className="mt-1.5 text-sm font-semibold" style={{ color: subColor }}>{role}</p>}
        {contactLine && <p className="mt-2.5 text-[12px]" style={{ color: subColor }}>{contactLine}</p>}
        <div className="mt-4 flex items-center justify-center gap-2" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span key={i} className="size-1.5 rotate-45" style={{ backgroundColor: ruleColor }} />
          ))}
        </div>
      </header>
    );
  } else if (layout === "smallcaps") {
    // BENTZ: contact line, rule, then a spaced small-caps name.
    header = (
      <header className="text-center">
        {contactLine && <p className="text-[11px] tracking-wide" style={{ color: subColor }}>{contactLine}</p>}
        <hr className="my-3 border-t" style={{ borderColor: ruleColor }} />
        <h1 className="text-3xl font-semibold uppercase tracking-[0.18em]" style={{ color: nameColor }}>
          {fullName}
        </h1>
        {role && <p className="mt-1.5 text-xs uppercase tracking-wide" style={{ color: subColor }}>{role}</p>}
      </header>
    );
  } else if (layout === "center-top") {
    // IVE / PHARRELL: contact block on top, name centred below, rule.
    header = (
      <header className="text-center">
        {contacts.length > 0 && (
          <div className="space-y-0.5 text-[12px]" style={{ color: subColor }}>
            {contacts.map((c) => (
              <p key={c}>{c}</p>
            ))}
          </div>
        )}
        <h1 className={cn("mt-5", nameCls)} style={{ color: nameColor }}>{fullName}</h1>
        {role && <p className="mt-1 text-sm font-semibold" style={{ color: subColor }}>{role}</p>}
        <hr className="mt-3 border-t" style={{ borderColor: ruleColor }} />
      </header>
    );
  } else {
    // FEYNMAN / TURING / LAMARR ("left-right"), and CURIE ("ribbon"): name left,
    // contacts stacked top-right, rule under. Ribbon adds a corner flag.
    header = (
      <header className="relative">
        {layout === "ribbon" && (
          <span
            aria-hidden
            className="absolute -top-16 right-8 h-16 w-9"
            style={{ backgroundColor: accent, clipPath: "polygon(0 0,100% 0,100% 100%,50% 74%,0 100%)" }}
          />
        )}
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <h1 className={nameCls} style={{ color: nameColor }}>{fullName}</h1>
            {role && <p className="mt-1 text-sm font-semibold" style={{ color: subColor }}>{role}</p>}
          </div>
          {contacts.length > 0 && (
            <div className="shrink-0 space-y-0.5 pt-1 text-right text-[12px]" style={{ color: subColor }}>
              {contacts.map((c) => (
                <p key={c}>{c}</p>
              ))}
            </div>
          )}
        </div>
        <hr className="mt-4 border-t" style={{ borderColor: ruleColor }} />
      </header>
    );
  }

  return (
    <div
      data-cl-preview
      className={cn("relative mx-auto w-full max-w-[760px] shadow-card-lg", sp.pad)}
      style={{ fontFamily, minHeight: "1000px", backgroundColor: pageBg, color: bodyColor }}
    >
      {header}
      {bodyBlock}
    </div>
  );
}

/** The full A4 preview's fixed design width, used to scale it into a thumbnail. */
const PREVIEW_WIDTH = 760;

/**
 * A non-interactive, scaled-down render of a saved cover letter for the dashboard
 * cards - the real letter (same layouts/fonts/accent as the full preview) shrunk
 * to fit its container, so a card shows an accurate miniature of the letter.
 */
export function CoverLetterMiniPreview({
  data,
  width = 150,
}: {
  data: CoverLetterPreviewData;
  width?: number;
}) {
  const scale = width / PREVIEW_WIDTH;
  return (
    <div
      className="pointer-events-none h-full select-none overflow-hidden bg-white"
      style={{ width }}
      aria-hidden
    >
      <div style={{ width: PREVIEW_WIDTH, transform: `scale(${scale})`, transformOrigin: "top left" }}>
        <CoverLetterPreview data={data} />
      </div>
    </div>
  );
}
