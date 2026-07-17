"use client";

import { Children } from "react";
import {
  useResumeStore,
  type SectionKey,
  type AdditionalSection,
  type DesignOptions,
} from "@/lib/store/resume-store";
import { spaceBlocks } from "@/lib/html-spacing";
import { displayUrl, normalizeUrl } from "@/lib/url";

/** Format a start/end pair as "start - end", omitting empty sides; "" if both blank. */
function dateRange(start: string, end: string) {
  if (!start && !end) return "";
  return [start, end].filter(Boolean).join(" - ");
}


// Maps each selectable font id to the concrete CSS font-family stack applied to
// the rendered resume (with web-safe fallbacks).
const FONT_STACK: Record<DesignOptions["font"], string> = {
  roboto: "var(--font-roboto-flex), Verdana, Geneva, Tahoma, sans-serif",
  georgia: "Georgia, 'Times New Roman', serif",
  garamond: "'EB Garamond', Garamond, Georgia, serif",
};

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
  const sp = SPACING[design.spacing];

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
    children,
  }: {
    title: string;
    /** Kept for call-site clarity; active styling is applied per body below. */
    sectionKey?: string;
    /** Kept for call-site clarity; active styling is applied per entry below. */
    entryIds?: string[];
    children: React.ReactNode;
  }) {
    // Space entries with an inline top margin (not Tailwind `space-y`, which the
    // PDF rasterizer drops) so the gaps appear in the downloaded PDF too.
    const items = Children.toArray(children);
    return (
      <section className={`relative ${sp.section}`}>
        <div className="relative">
          <h2
            className="border-b pb-1 text-[11px] font-bold uppercase tracking-wide"
            style={{ color: accent, borderColor: accent }}
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

  const headerActive =
    !previewOnly &&
    (s.activeSection === "personal" || s.activeSection === "contact");
  const header = (
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
            className="text-2xl font-bold tracking-tight text-neutral-900"
            {...editActive(headerActive ? EDIT_BLUE : undefined)}
          >
            {fullName}
          </h1>
          {s.personal.jobTitle && (
            <p className="text-sm" style={{ color: accent }}>
              {s.personal.jobTitle}
            </p>
          )}
          {contactLine && (
            <p
              className="mt-1.5 text-[11px] text-neutral-600"
              {...editActive(headerActive ? EDIT_BLUE : undefined)}
            >
              {contactLine}
            </p>
          )}
        </div>
      </div>
    </header>
  );

  const fontStyle = { fontFamily: FONT_STACK[design.font] };
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
        className="flex min-h-[calc(100vh-7rem)] w-full overflow-hidden rounded-2xl text-neutral-900"
        style={{ ...fontStyle, backgroundColor: design.bg || undefined }}
      >
        <div className={`flex w-full ${onRight ? "flex-row-reverse" : ""}`}>
          <aside
            className="w-[36%] shrink-0 self-stretch bg-[#1f2937] px-6 py-9 text-white [&_h2]:text-white! [&_h2]:border-white/25! [&_p]:text-white/80! [&_span]:text-white/80! [&_div]:text-white/80! [&_a]:text-white/90!"
          >
            {s.personal.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={s.personal.photo}
                alt=""
                className="mb-4 size-16 rounded-full object-cover ring-2 ring-white/20"
              />
            ) : (
              <div className="mb-4 size-16 rounded-full bg-white/15" />
            )}
            <h1 className="text-lg font-bold leading-tight text-white">
              {fullName}
            </h1>
            {s.personal.jobTitle && (
              <p className="text-xs text-white/70">{s.personal.jobTitle}</p>
            )}
            {contactItems.length > 0 && (
              <div className="mt-3 space-y-0.5">
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
