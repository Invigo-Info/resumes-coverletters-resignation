"use client";

import { Children, type CSSProperties } from "react";
import {
  useResumeStore,
  type SectionKey,
  type AdditionalSection,
  type DesignOptions,
} from "@/lib/store/resume-store";
import { spaceBlocks } from "@/lib/html-spacing";
import { displayUrl, normalizeUrl } from "@/lib/url";
import { resolveResumeTheme } from "@/lib/resume-themes";
import { FONT_STACK } from "@/lib/font-pairs";
import { getTemplate, type HeadingVariant } from "@/lib/templates";
import { cn } from "@/lib/utils";

/** Format a start/end pair as "start - end", omitting empty sides; "" if both blank. */
function dateRange(start: string, end: string) {
  if (!start && !end) return "";
  return [start, end].filter(Boolean).join(" - ");
}

/** Turn a #rrggbb accent into an rgba() with the given alpha (for tinted bands);
 *  returns the input untouched if it isn't a 6-digit hex. */
function withAlpha(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/**
 * Section-heading skins - one per template `variant`. Each returns the h2 class +
 * inline style (color/border/background), given the resume accent and whether the
 * layout is a single centered column. This is the visual signature that makes
 * each template style read distinctly in the live preview (the section headings
 * repeat throughout the resume). The chosen template's accent, font, columns,
 * spacing and color theme still apply on top - this only reskins the heading rule.
 */
type HeadingSkin = (
  accent: string,
  centered: boolean
) => { className: string; style: CSSProperties };

const HEADING_SKINS: Record<HeadingVariant, HeadingSkin> = {
  // Boxed rule top + bottom (the original default look).
  classic: (accent, centered) => ({
    className: centered
      ? "border-y py-1 text-center text-[11px] font-bold uppercase tracking-wide"
      : "border-b pb-1 text-[11px] font-bold uppercase tracking-wide",
    style: { color: accent, borderColor: accent },
  }),
  // Short underline that spans only the title text.
  underline: (accent, centered) => ({
    className:
      (centered ? "mx-auto " : "") +
      "block w-fit border-b-2 pb-0.5 text-[11px] font-bold uppercase tracking-wide",
    style: { color: accent, borderColor: accent },
  }),
  // Accent bar to the left of the title (falls back to the boxed look when the
  // layout is a single centered column, where a left bar would read as off-axis).
  bar: (accent, centered) =>
    centered
      ? {
          className:
            "border-y py-1 text-center text-[11px] font-bold uppercase tracking-wide",
          style: { color: accent, borderColor: accent },
        }
      : {
          className: "border-l-4 pl-2 text-[11px] font-bold uppercase tracking-wide",
          style: { color: accent, borderColor: accent },
        },
  // Wide letter-spaced caps over a thin hairline rule.
  caps: (accent, centered) => ({
    className:
      (centered ? "text-center " : "") +
      "border-b py-0.5 text-[11px] font-bold uppercase tracking-[0.18em]",
    style: { color: accent, borderColor: accent },
  }),
  // No rule at all - separation carried by spacing alone.
  minimal: (accent, centered) => ({
    className:
      (centered ? "text-center " : "") +
      "text-[11px] font-bold uppercase tracking-wide",
    style: { color: accent },
  }),
  // Full-width accent-tinted band behind the title.
  band: (accent, centered) => ({
    className:
      (centered ? "text-center " : "") +
      "rounded px-2 py-1 text-[11px] font-bold uppercase tracking-wide",
    style: { color: accent, backgroundColor: withAlpha(accent, 0.1) },
  }),
  // Editorial double rule with the widest tracking (pairs with the serif styles).
  serifRule: (accent, centered) => ({
    className:
      (centered ? "text-center " : "") +
      "border-y-2 py-1 text-[11px] font-bold uppercase tracking-[0.2em]",
    style: { color: accent, borderColor: accent },
  }),
};


// The font-id -> CSS font-family map is shared with the Design panel (see
// font-pairs.ts) so a card can never advertise a font the preview won't render.

const SPACING: Record<
  DesignOptions["spacing"],
  { section: string; gapEm: number; lead: string }
> = {
  // gapEm is the per-entry gap, applied INLINE so it survives the PDF export
  // (html2canvas drops class-based `space-y` spacing).
  dense: { section: "mt-3", gapEm: 0.25, lead: "leading-snug" },
  normal: { section: "mt-4", gapEm: 0.5, lead: "leading-normal" },
  loose: { section: "mt-6", gapEm: 0.75, lead: "leading-relaxed" },
};

/** Sections that live in the sidebar when a two-column layout is selected. */
function isSidebar(key: SectionKey, additional: AdditionalSection[]) {
  if (key === "skills") return true;
  const sec = additional.find((a) => a.id === key);
  return sec ? ["languages", "links", "hobbies"].includes(sec.type) : false;
}

/**
 * Live, paper-styled render of the resume that mirrors the store in real time and
 * doubles as the PDF source. Applies the chosen design (font, spacing, color,
 * one/two-column + dark-sidebar layout), reorders sections, and overlays
 * editor-only highlights (active section/entry/block) that are stripped from export.
 */
export function LivePreview({ previewOnly = false }: { previewOnly?: boolean } = {}) {
  const s = useResumeStore();
  const { design } = s;
  const accent = design.color;
  // The selected color theme is a COMPLETE palette: it colors the sidebar panel
  // and, for the dark theme, flips the body text to light. accent/bg still come
  // from design (a swatch mirrors them there); sidebar + dark are theme-only.
  const theme = resolveResumeTheme(design.themeId, design.color, design.bg);
  const sidebarBg = theme?.sidebarBg ?? "#1f2937";
  const darkText = theme?.darkText ?? false;
  const sp = SPACING[design.spacing];
  // Font pair: primary drives the name + section headings, secondary the body.
  // Older drafts have no secondary - fall back to the single family.
  const primaryFamily = FONT_STACK[design.font];
  const secondaryFamily = FONT_STACK[design.fontSecondary ?? design.font];
  // The selected template's heading skin gives each style its own visual
  // signature (see HEADING_SKINS). Read straight from the chosen templateId so it
  // always matches the carousel selection; unknown/older ids fall back to classic.
  const headingSkin =
    HEADING_SKINS[getTemplate(s.templateId)?.preset.variant ?? "classic"] ??
    HEADING_SKINS.classic;

  // Click-to-edit: clicking a section in the live preview opens that section in
  // the editor (and highlights it in the nav). Only in the interactive editor
  // preview (not the view-only Design tab or the PDF export), and only for
  // sections the guided flow has already unlocked - matching the nav's rules.
  const canNav = (key: string) =>
    !previewOnly && s.unlockedSections.includes(key);
  const navTo = (key: string) => {
    if (canNav(key)) s.setActiveSection(key);
  };

  const fullName =
    `${s.personal.firstName} ${s.personal.lastName}`.trim() || "Your Name";
  // Initials for the "you are editing here" presence badge on the active entry.
  const initials =
    ((s.personal.firstName[0] ?? "") + (s.personal.lastName[0] ?? ""))
      .toUpperCase() || "•";
  const contactLine = [
    s.contact.email,
    s.contact.phone,
    s.contact.location,
    s.contact.linkedin,
  ]
    .filter(Boolean)
    .join("  •  ");

  // "You're editing here" cue: the section/entry currently open in the editor
  // renders its body text in this blue (like resume.co), instead of a box. The
  // colour is an editor-only affordance - it is stripped from the exported PDF by
  // `previewOnly` never being set there, and the PDF clones ignore it anyway.
  const EDIT_BLUE = "#2563EB";
  // Body colour for one entry: blue while that entry is the active one.
  const entryColor = (id: string) =>
    !previewOnly && id === s.activeEntryId ? EDIT_BLUE : undefined;
  // Body colour for a whole section (used by entry-less sections like summary /
  // skills / languages / hobbies): blue while that section's editor is open.
  const sectionColor = (key: string) =>
    !previewOnly && key === s.activeSection && s.activeEntryId == null
      ? EDIT_BLUE
      : undefined;
  // Turn a colour into element props that ALSO tag the node so the PDF exporter
  // strips the colour on clone - the editor-only blue must never ship in the
  // downloaded resume. Returns undefined (spreads nothing) when not active.
  const editActive = (color: string | undefined) =>
    color ? { style: { color }, "data-edit-active": "" } : undefined;

  // Per-entry highlight: wraps a single inner entry (one job, one degree…) so
  // only that entry lights up when it's the one being edited. Excluded from the
  // PDF via `data-html2canvas-ignore`, same as the section highlight.
  function EntryHighlight({
    id,
    children,
  }: {
    id: string;
    children: React.ReactNode;
  }) {
    const active = !previewOnly && id === s.activeEntryId;
    return (
      <div className="relative">
        {active && (
          // Presence badge - "you're editing here", like resume.co. The body text
          // of the active entry also turns blue (handled at each render site).
          <span
            aria-hidden
            data-html2canvas-ignore
            className="pointer-events-none absolute -left-5 top-0 z-10 grid size-4 place-items-center rounded-full bg-[#2563EB] text-[8px] font-bold leading-none text-white shadow-sm ring-2 ring-white"
          >
            {initials}
          </span>
        )}
        <div className="relative">{children}</div>
      </div>
    );
  }

  function PreviewSection({
    title,
    sectionKey,
    children,
  }: {
    title: string;
    /** The editor section key this block maps to; enables click-to-edit. */
    sectionKey?: string;
    /** Kept for call-site clarity; active styling is applied per entry below. */
    entryIds?: string[];
    children: React.ReactNode;
  }) {
    // Space entries with an inline top margin (not Tailwind `space-y`, which the
    // PDF rasterizer drops) so the gaps appear in the downloaded PDF too.
    const items = Children.toArray(children);
    const skin = headingSkin(accent, centered);
    // Click anywhere on the section to open it in the editor (unlocked sections
    // only; no-op in the view-only/PDF render).
    const clickable = !!sectionKey && canNav(sectionKey);
    return (
      <section
        className={cn(
          "relative",
          sp.section,
          clickable &&
            "cursor-pointer rounded-md transition-colors hover:bg-neutral-500/5"
        )}
        onClick={clickable ? () => navTo(sectionKey) : undefined}
        title={clickable ? "Edit this section" : undefined}
      >
        <div className="relative">
          <h2
            className={skin.className}
            style={{ ...skin.style, fontFamily: primaryFamily }}
          >
            {title}
          </h2>
          <div className={`mt-2 ${sp.lead}`}>
            {items.map((child, i) => (
              <div key={i} style={i === 0 ? undefined : { marginTop: `${sp.gapEm}em` }}>
                {child}
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Render a user-added ("additional") section, branching on its type. Returns
  // null when the section has no meaningful content yet so it stays hidden.
  const renderAdditional = (sec: AdditionalSection) => {
    // `has` checks a plain-text field; `htmlHas` strips tags first so empty rich
    // text (e.g. "<p></p>") doesn't count as content.
    const has = (k: string) => sec.entries.some((e) => (e[k] ?? "").trim());
    const htmlHas = (k: string) =>
      sec.entries.some((e) => (e[k] ?? "").replace(/<[^>]*>/g, "").trim());

    switch (sec.type) {
      case "internships":
        if (!has("jobTitle") && !has("company")) return null;
        return (
          <PreviewSection
            title={sec.title}
            key={sec.id}
            sectionKey={sec.id}
            entryIds={sec.entries.map((e) => e.id)}
          >
            {sec.entries.map((e) => (
              <EntryHighlight id={e.id} key={e.id}>
                <div className="text-[11px] text-neutral-700">
                  <div className="flex justify-between font-semibold text-neutral-900">
                    <span>{e.jobTitle || "Job title"}</span>
                    <span className="font-normal text-neutral-500">
                      {dateRange(e.startDate, e.endDate)}
                    </span>
                  </div>
                  {(e.company || e.location) && (
                    <p className="italic text-neutral-500">
                      {[e.company, e.location].filter(Boolean).join(", ")}
                    </p>
                  )}
                  {(e.description ?? "").replace(/<[^>]*>/g, "").trim() && (
                    <div
                      className="mt-1 [&_li]:ml-4 [&_li]:list-disc"
                      {...editActive(entryColor(e.id))}
                      dangerouslySetInnerHTML={{ __html: spaceBlocks(e.description, 0.5) }}
                    />
                  )}
                </div>
              </EntryHighlight>
            ))}
          </PreviewSection>
        );
      case "courses":
        if (!has("institution") && !has("course")) return null;
        return (
          <PreviewSection
            title={sec.title}
            key={sec.id}
            sectionKey={sec.id}
            entryIds={sec.entries.map((e) => e.id)}
          >
            {sec.entries.map((e) => (
              <EntryHighlight id={e.id} key={e.id}>
                <div className="text-[11px] text-neutral-700">
                  {/* The course is the credential; the institution qualifies it.
                      Same precedence as the entry card's header. */}
                  <div className="flex justify-between font-semibold text-neutral-900">
                    <span>{e.course || e.institution}</span>
                    <span className="font-normal text-neutral-500">
                      {dateRange(e.startDate, e.endDate)}
                    </span>
                  </div>
                  {e.course && e.institution && (
                    <p
                      className="italic text-neutral-500"
                      {...editActive(entryColor(e.id))}
                    >
                      {e.institution}
                    </p>
                  )}
                </div>
              </EntryHighlight>
            ))}
          </PreviewSection>
        );
      case "references":
        if (!has("name") && !has("company")) return null;
        return (
          <PreviewSection
            title={sec.title}
            key={sec.id}
            sectionKey={sec.id}
            entryIds={sec.entries.map((e) => e.id)}
          >
            {/* One contact per block: name, then company, then how to reach
                them. Joining these into a single comma-separated line left
                stray separators whenever a field was blank. */}
            {sec.entries
              .filter((e) => (e.name ?? "").trim() || (e.company ?? "").trim())
              .map((e) => (
                <EntryHighlight id={e.id} key={e.id}>
                  <div className="text-[11px] text-neutral-700">
                    {e.name && (
                      <p className="font-semibold text-neutral-900">{e.name}</p>
                    )}
                    {e.company && (
                      <p className="italic text-neutral-500">{e.company}</p>
                    )}
                    {(e.email || e.phone) && (
                      <p {...editActive(entryColor(e.id))}>
                        {[e.email, e.phone].filter(Boolean).join("  •  ")}
                      </p>
                    )}
                  </div>
                </EntryHighlight>
              ))}
          </PreviewSection>
        );
      case "languages":
        if (!has("language")) return null;
        return (
          <PreviewSection title={sec.title} key={sec.id} sectionKey={sec.id}>
            <p
              className="text-[11px] text-neutral-700"
              {...editActive(sectionColor(sec.id))}
            >
              {sec.entries
                .filter((e) => e.language)
                .map((e) =>
                  e.proficiency ? `${e.language} (${e.proficiency})` : e.language
                )
                .join(", ")}
            </p>
          </PreviewSection>
        );
      case "links":
        if (!has("title") && !has("url")) return null;
        return (
          <PreviewSection
            title={sec.title}
            key={sec.id}
            sectionKey={sec.id}
            entryIds={sec.entries.map((e) => e.id)}
          >
            {sec.entries
              .filter((e) => e.title || e.url)
              .map((e) => (
                <EntryHighlight id={e.id} key={e.id}>
                  <p
                    className="text-[11px] break-words text-neutral-700"
                    {...editActive(entryColor(e.id))}
                  >
                    {e.title && <span className="font-semibold">{e.title}: </span>}
                    {/* Reads as a person would say it ("linkedin.com"), but the
                        href keeps the full address the user typed. */}
                    <a
                      href={normalizeUrl(e.url ?? "")}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="underline"
                      style={{ color: accent }}
                    >
                      {displayUrl(e.url ?? "")}
                    </a>
                  </p>
                </EntryHighlight>
              ))}
          </PreviewSection>
        );
      case "hobbies":
        if (!htmlHas("body")) return null;
        return (
          <PreviewSection title={sec.title} key={sec.id} sectionKey={sec.id}>
            <div
              className="text-[11px] text-neutral-700"
              {...editActive(sectionColor(sec.id))}
              dangerouslySetInnerHTML={{ __html: spaceBlocks(sec.entries[0]?.body ?? "", 0.5) }}
            />
          </PreviewSection>
        );
      case "custom":
        if (!has("header") && !htmlHas("body")) return null;
        return (
          <PreviewSection
            title={sec.title}
            key={sec.id}
            sectionKey={sec.id}
            entryIds={sec.entries.map((e) => e.id)}
          >
            {sec.entries.map((e) => (
              <EntryHighlight id={e.id} key={e.id}>
                <div className="text-[11px] text-neutral-700">
                  {e.header && (
                    <p className="font-semibold text-neutral-900">{e.header}</p>
                  )}
                  {e.subheader && (
                    <p className="italic text-neutral-500">{e.subheader}</p>
                  )}
                  {(e.body ?? "").replace(/<[^>]*>/g, "").trim() && (
                    <div
                      className="mt-0.5 [&_li]:ml-4 [&_li]:list-disc"
                      {...editActive(entryColor(e.id))}
                      dangerouslySetInnerHTML={{ __html: spaceBlocks(e.body, 0.5) }}
                    />
                  )}
                </div>
              </EntryHighlight>
            ))}
          </PreviewSection>
        );
      default:
        return null;
    }
  };

  // Render any section by key: dispatch to renderAdditional for user-added
  // sections, otherwise render the matching built-in section (each hidden until
  // it has content).
  const renderSection = (key: SectionKey) => {
    const addSec = s.additional.find((a) => a.id === key);
    if (addSec) return renderAdditional(addSec);

    switch (key) {
      case "summary":
        return s.summary.replace(/<[^>]*>/g, "").trim() ? (
          <PreviewSection
            title={s.summaryTitle?.trim() || "Professional summary"}
            key={key}
            sectionKey={key}
          >
            <div
              className="text-[11px] text-neutral-700 [&_li]:ml-4 [&_li]:list-disc"
              {...editActive(sectionColor(key))}
              dangerouslySetInnerHTML={{ __html: spaceBlocks(s.summary, 0.5) }}
            />
          </PreviewSection>
        ) : null;
      case "employment":
        return s.employment.some((e) => e.jobTitle || e.company) ? (
          <PreviewSection
            title="Employment history"
            key={key}
            sectionKey={key}
            entryIds={s.employment.map((e) => e.id)}
          >
            {s.employment.map((e) => (
              <EntryHighlight id={e.id} key={e.id}>
                <div className="text-[11px] text-neutral-700">
                  <div className="flex justify-between font-semibold text-neutral-900">
                    <span>{e.jobTitle || "Job title"}</span>
                    <span className="font-normal text-neutral-500">
                      {dateRange(e.startDate, e.endDate)}
                    </span>
                  </div>
                  {(e.company || e.location) && (
                    <p className="italic text-neutral-500">
                      {[e.company, e.location].filter(Boolean).join(", ")}
                    </p>
                  )}
                  {e.description.replace(/<[^>]*>/g, "").trim() && (
                    <div
                      className="mt-1 [&_li]:ml-4 [&_li]:list-disc"
                      // The entry being edited renders its bullets in blue.
                      {...editActive(entryColor(e.id))}
                      dangerouslySetInnerHTML={{
                        __html: spaceBlocks(e.description, 0.5),
                      }}
                    />
                  )}
                </div>
              </EntryHighlight>
            ))}
          </PreviewSection>
        ) : null;
      case "skills": {
        // Each skill is its own span so the one hovered in the editor can light
        // up blue on its own; the commas sit outside the coloured span.
        const named = s.skills.filter((sk) => sk.name);
        return named.length ? (
          <PreviewSection title={s.skillsTitle?.trim() || "Skills"} key={key} sectionKey={key}>
            <p className="text-[11px] text-neutral-700">
              {named.map((sk, i) => (
                <span key={sk.id}>
                  <span
                    {...editActive(
                      !previewOnly && sk.id === s.hoveredSkillId ? EDIT_BLUE : undefined
                    )}
                  >
                    {sk.name}
                  </span>
                  {i < named.length - 1 ? ", " : ""}
                </span>
              ))}
            </p>
          </PreviewSection>
        ) : null;
      }
      case "education":
        return s.education.some(
          (e) => e.institution || e.degree || e.description.replace(/<[^>]*>/g, "").trim()
        ) ? (
          <PreviewSection
            title="Education"
            key={key}
            sectionKey={key}
            entryIds={s.education.map((e) => e.id)}
          >
            {s.education.map((e) => (
              <EntryHighlight id={e.id} key={e.id}>
                <div className="text-[11px] text-neutral-700">
                  <div className="flex justify-between font-semibold text-neutral-900">
                    <span>{e.degree || e.institution}</span>
                    <span className="font-normal text-neutral-500">
                      {dateRange(e.startDate, e.endDate)}
                    </span>
                  </div>
                  {(e.institution || e.location) && (
                    <p
                      className="italic text-neutral-500"
                      {...editActive(entryColor(e.id))}
                    >
                      {[e.institution, e.location].filter(Boolean).join(", ")}
                    </p>
                  )}
                  {e.description.replace(/<[^>]*>/g, "").trim() && (
                    <div
                      className="mt-1 [&_li]:ml-4 [&_li]:list-disc"
                      // The entry being edited renders its details in blue.
                      {...editActive(entryColor(e.id))}
                      dangerouslySetInnerHTML={{
                        __html: spaceBlocks(e.description, 0.5),
                      }}
                    />
                  )}
                </div>
              </EntryHighlight>
            ))}
          </PreviewSection>
        ) : null;
      default:
        return null;
    }
  };

  const twoCol = design.columns !== "centered";
  // "centered" single-column templates (e.g. Classic ATS) center the header and
  // the section titles, matching that family of resume designs.
  const centered = !twoCol;
  const mainKeysRaw = twoCol
    ? s.sectionOrder.filter((k) => !isSidebar(k, s.additional))
    : s.sectionOrder;
  // Professional summary always renders at the top of the resume, even though it
  // sits last in the editing/nav order.
  const mainKeys = mainKeysRaw.includes("summary")
    ? ["summary", ...mainKeysRaw.filter((k) => k !== "summary")]
    : mainKeysRaw;
  const sidebarKeys = twoCol
    ? s.sectionOrder.filter((k) => isSidebar(k, s.additional))
    : [];

  const header = centered ? (
    // Centered single-column header: photo on top, then contact, name, title -
    // all centered (matches the Classic ATS family of templates).
    <header className="relative flex flex-col items-center text-center">
      {s.personal.photo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={s.personal.photo}
          alt=""
          className="mb-2 size-17 rounded-full object-cover"
        />
      )}
      {contactLine && (
        <p
          className={cn(
            "text-[11px] text-neutral-600",
            canNav("contact") && "cursor-pointer rounded hover:bg-neutral-500/5"
          )}
          onClick={canNav("contact") ? () => navTo("contact") : undefined}
          title={canNav("contact") ? "Edit contact information" : undefined}
        >
          {contactLine}
        </p>
      )}
      <h1
        className={cn(
          "mt-1 text-2xl font-bold tracking-tight text-neutral-900 wrap-anywhere",
          canNav("personal") && "cursor-pointer"
        )}
        style={{ fontFamily: primaryFamily }}
        onClick={canNav("personal") ? () => navTo("personal") : undefined}
        title={canNav("personal") ? "Edit personal details" : undefined}
      >
        {fullName}
      </h1>
      {s.personal.jobTitle && (
        <p
          className={cn("text-sm italic", canNav("personal") && "cursor-pointer")}
          style={{ color: accent }}
          onClick={canNav("personal") ? () => navTo("personal") : undefined}
        >
          {s.personal.jobTitle}
        </p>
      )}
    </header>
  ) : (
    <header className="relative">
      <div className="relative flex items-start gap-4">
        {s.personal.photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={s.personal.photo}
            alt=""
            className="size-17 shrink-0 rounded-full object-cover"
          />
        )}
        <div className="min-w-0">
          <h1
            className={cn(
              "text-2xl font-bold tracking-tight text-neutral-900 wrap-anywhere",
              canNav("personal") && "cursor-pointer"
            )}
            style={{ fontFamily: primaryFamily }}
            onClick={canNav("personal") ? () => navTo("personal") : undefined}
            title={canNav("personal") ? "Edit personal details" : undefined}
          >
            {fullName}
          </h1>
          {s.personal.jobTitle && (
            <p
              className={cn("text-sm", canNav("personal") && "cursor-pointer")}
              style={{ color: accent }}
              onClick={canNav("personal") ? () => navTo("personal") : undefined}
            >
              {s.personal.jobTitle}
            </p>
          )}
          {contactLine && (
            <p
              className={cn(
                "mt-1.5 text-[11px] text-neutral-600",
                canNav("contact") && "cursor-pointer rounded hover:bg-neutral-500/5"
              )}
              onClick={canNav("contact") ? () => navTo("contact") : undefined}
              title={canNav("contact") ? "Edit contact information" : undefined}
            >
              {contactLine}
            </p>
          )}
        </div>
      </div>
    </header>
  );

  const fontStyle = { fontFamily: secondaryFamily };
  const onRight = design.columns === "right";

  // Dark-sidebar templates (Professional, Corporate, Balanced): name + contact +
  // sidebar sections live inside a dark column; no full-width header.
  if (twoCol && design.dark) {
    const contactItems = [
      s.contact.email,
      s.contact.phone,
      s.contact.location,
      s.contact.linkedin,
    ].filter(Boolean);
    return (
      <div
        data-resume-preview
        data-resume-theme={darkText ? "dark" : undefined}
        className="flex min-h-[calc(100vh-7rem)] w-full overflow-hidden rounded-2xl text-neutral-900"
        style={{ ...fontStyle, backgroundColor: design.bg || undefined }}
      >
        <div className={`flex w-full ${onRight ? "flex-row-reverse" : ""}`}>
          <aside
            style={{ backgroundColor: sidebarBg }}
            className="w-[36%] shrink-0 self-stretch px-6 py-9 text-white [&_h2]:text-white! [&_h2]:border-white/25! [&_p]:text-white/80! [&_span]:text-white/80! [&_div]:text-white/80! [&_a]:text-white/90!"
          >
            {s.personal.photo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={s.personal.photo}
                alt=""
                className="mb-4 size-16 rounded-full object-cover ring-2 ring-white/20"
              />
            )}
            <h1
              className={cn(
                "text-lg font-bold leading-tight text-white wrap-anywhere",
                canNav("personal") && "cursor-pointer"
              )}
              style={{ fontFamily: primaryFamily }}
              onClick={canNav("personal") ? () => navTo("personal") : undefined}
              title={canNav("personal") ? "Edit personal details" : undefined}
            >
              {fullName}
            </h1>
            {s.personal.jobTitle && (
              <p
                className={cn(
                  "text-xs text-white/70",
                  canNav("personal") && "cursor-pointer"
                )}
                onClick={canNav("personal") ? () => navTo("personal") : undefined}
              >
                {s.personal.jobTitle}
              </p>
            )}
            {contactItems.length > 0 && (
              <div
                className={cn(
                  "mt-3 space-y-0.5",
                  canNav("contact") && "cursor-pointer rounded hover:bg-white/5"
                )}
                onClick={canNav("contact") ? () => navTo("contact") : undefined}
                title={canNav("contact") ? "Edit contact information" : undefined}
              >
                {contactItems.map((c) => (
                  <p key={c} className="text-[10px] text-white/70">{c}</p>
                ))}
              </div>
            )}
            {sidebarKeys.map(renderSection)}
          </aside>
          <div className="flex-1 px-8 py-9">{mainKeys.map(renderSection)}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      data-resume-preview
      data-resume-theme={darkText ? "dark" : undefined}
      className="min-h-[calc(100vh-7rem)] w-full rounded-2xl px-12 py-11 text-neutral-900"
      style={{ ...fontStyle, backgroundColor: design.bg || undefined }}
    >
      {header}

      {twoCol && sidebarKeys.length > 0 ? (
        <div className={`mt-2 flex gap-6 ${onRight ? "flex-row-reverse" : ""}`}>
          <div className="w-[34%] shrink-0">{sidebarKeys.map(renderSection)}</div>
          <div className="flex-1">{mainKeys.map(renderSection)}</div>
        </div>
      ) : (
        mainKeys.map(renderSection)
      )}
    </div>
  );
}
