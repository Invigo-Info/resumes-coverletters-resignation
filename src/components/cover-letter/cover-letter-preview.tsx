"use client";

import { useCoverLetterStore, type CLFontId } from "@/lib/store/cover-letter-store";
import { bodyToHtml } from "@/lib/cover-letter/format";

const FONT_STACK: Record<CLFontId, string> = {
  georgia: "Georgia, 'Times New Roman', serif",
  inter: "var(--font-sans), system-ui, sans-serif",
  garamond: "'EB Garamond', Garamond, Georgia, serif",
};

/**
 * A4-style cover letter document (step 14 / step 28). Tagged with
 * `data-cl-preview` so the PDF exporter can find the visible node.
 */
export function CoverLetterPreview() {
  const { personal, jobDetails, letter, design } = useCoverLetterStore();

  const fullName = `${personal.firstName} ${personal.lastName}`.trim() || "Your Name";
  const role = jobDetails.desiredJobTitle || "";
  const contactLine = [personal.address, personal.phone, personal.email]
    .map((x) => x.trim())
    .filter(Boolean)
    .join("  •  ");

  const company = letter.companyName || jobDetails.companyName;
  const hiringManager = letter.hiringManagerName || jobDetails.hiringManagerName;
  const recipient = [hiringManager, company].filter(Boolean).join(", ");

  // The body (AI plain text or edited HTML) is normalised to HTML paragraphs.
  const bodyHtml = bodyToHtml(letter.body || "");

  return (
    <div
      data-cl-preview
      className="mx-auto w-full max-w-[760px] bg-white px-14 py-16 text-neutral-900 shadow-card-lg"
      style={{ fontFamily: FONT_STACK[design.font] ?? FONT_STACK.georgia, minHeight: "1000px" }}
    >
      {/* Header */}
      <header>
        {contactLine && (
          <p className="text-[10px] uppercase tracking-wide text-neutral-700">
            {contactLine}
          </p>
        )}
        <h1
          className="mt-2 text-3xl font-bold uppercase tracking-wide"
          style={{ color: design.accent }}
        >
          {fullName}
        </h1>
        {role && <p className="text-sm font-semibold italic text-neutral-600">{role}</p>}
        <hr className="mt-3 border-t-2" style={{ borderColor: design.accent }} />
      </header>

      {/* Body */}
      <div className="mt-6 text-[13px] leading-relaxed text-neutral-800">
        {recipient && <p className="mb-4">{recipient}</p>}
        {bodyHtml ? (
          <div
            className="[&_li]:ml-4 [&_li]:list-disc [&_p]:mb-4"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        ) : (
          <p className="text-neutral-400">
            Your generated cover letter will appear here.
          </p>
        )}
      </div>
    </div>
  );
}
