"use client";

import {
  useResumeStore,
  type SectionKey,
  type AdditionalSection,
  type DesignOptions,
} from "@/lib/store/resume-store";

function dateRange(start: string, end: string) {
  if (!start && !end) return "";
  return [start, end].filter(Boolean).join(" – ");
}

const FONT_STACK: Record<DesignOptions["font"], string> = {
  roboto: "var(--font-sans), system-ui, sans-serif",
  georgia: "Georgia, 'Times New Roman', serif",
  garamond: "'EB Garamond', Garamond, Georgia, serif",
};

const SPACING: Record<
  DesignOptions["spacing"],
  { section: string; gap: string; lead: string }
> = {
  dense: { section: "mt-3", gap: "space-y-1", lead: "leading-snug" },
  normal: { section: "mt-4", gap: "space-y-2", lead: "leading-normal" },
  loose: { section: "mt-6", gap: "space-y-3", lead: "leading-relaxed" },
};

/** Sections that live in the sidebar when a two-column layout is selected. */
function isSidebar(key: SectionKey, additional: AdditionalSection[]) {
  if (key === "skills") return true;
  const sec = additional.find((a) => a.id === key);
  return sec ? ["languages", "links", "hobbies"].includes(sec.type) : false;
}

export function LivePreview() {
  const s = useResumeStore();
  const { design } = s;
  const accent = design.color;
  const sp = SPACING[design.spacing];

  const fullName =
    `${s.personal.firstName} ${s.personal.lastName}`.trim() || "Your Name";
  const contactLine = [
    s.contact.email,
    s.contact.phone,
    s.contact.location,
    s.contact.linkedin,
  ]
    .filter(Boolean)
    .join("  •  ");

  function PreviewSection({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) {
    return (
      <section className={sp.section}>
        <h2
          className="border-b pb-1 text-[11px] font-bold uppercase tracking-wide"
          style={{ color: accent, borderColor: accent }}
        >
          {title}
        </h2>
        <div className={`mt-2 ${sp.gap} ${sp.lead}`}>{children}</div>
      </section>
    );
  }

  const renderAdditional = (sec: AdditionalSection) => {
    const has = (k: string) => sec.entries.some((e) => (e[k] ?? "").trim());
    const htmlHas = (k: string) =>
      sec.entries.some((e) => (e[k] ?? "").replace(/<[^>]*>/g, "").trim());

    switch (sec.type) {
      case "internships":
        if (!has("jobTitle") && !has("company")) return null;
        return (
          <PreviewSection title={sec.title} key={sec.id}>
            {sec.entries.map((e) => (
              <div key={e.id} className="text-[11px] text-neutral-700">
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
                    dangerouslySetInnerHTML={{ __html: e.description }}
                  />
                )}
              </div>
            ))}
          </PreviewSection>
        );
      case "courses":
        if (!has("institution") && !has("course")) return null;
        return (
          <PreviewSection title={sec.title} key={sec.id}>
            {sec.entries.map((e) => (
              <div key={e.id} className="text-[11px] text-neutral-700">
                <div className="flex justify-between font-semibold text-neutral-900">
                  <span>{e.institution}</span>
                  <span className="font-normal text-neutral-500">
                    {dateRange(e.startDate, e.endDate)}
                  </span>
                </div>
                {e.course && <p className="italic text-neutral-500">{e.course}</p>}
              </div>
            ))}
          </PreviewSection>
        );
      case "references":
        if (!has("name")) return null;
        return (
          <PreviewSection title={sec.title} key={sec.id}>
            <p className="text-[11px] text-neutral-700">
              {sec.entries
                .filter((e) => e.name)
                .map((e) => [e.name, e.company].filter(Boolean).join(", "))
                .join("  •  ")}
            </p>
          </PreviewSection>
        );
      case "languages":
        if (!has("language")) return null;
        return (
          <PreviewSection title={sec.title} key={sec.id}>
            <p className="text-[11px] text-neutral-700">
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
          <PreviewSection title={sec.title} key={sec.id}>
            {sec.entries
              .filter((e) => e.title || e.url)
              .map((e) => (
                <p key={e.id} className="text-[11px] text-neutral-700">
                  {e.title && <span className="font-semibold">{e.title}: </span>}
                  <span className="underline" style={{ color: accent }}>
                    {e.url}
                  </span>
                </p>
              ))}
          </PreviewSection>
        );
      case "hobbies":
        if (!htmlHas("body")) return null;
        return (
          <PreviewSection title={sec.title} key={sec.id}>
            <div
              className="text-[11px] text-neutral-700"
              dangerouslySetInnerHTML={{ __html: sec.entries[0]?.body ?? "" }}
            />
          </PreviewSection>
        );
      case "custom":
        if (!has("header") && !htmlHas("body")) return null;
        return (
          <PreviewSection title={sec.title} key={sec.id}>
            {sec.entries.map((e) => (
              <div key={e.id} className="text-[11px] text-neutral-700">
                {e.header && (
                  <p className="font-semibold text-neutral-900">{e.header}</p>
                )}
                {e.subheader && (
                  <p className="italic text-neutral-500">{e.subheader}</p>
                )}
                {(e.body ?? "").replace(/<[^>]*>/g, "").trim() && (
                  <div
                    className="mt-0.5 [&_li]:ml-4 [&_li]:list-disc"
                    dangerouslySetInnerHTML={{ __html: e.body }}
                  />
                )}
              </div>
            ))}
          </PreviewSection>
        );
      default:
        return null;
    }
  };

  const renderSection = (key: SectionKey) => {
    const addSec = s.additional.find((a) => a.id === key);
    if (addSec) return renderAdditional(addSec);

    switch (key) {
      case "summary":
        return s.summary.replace(/<[^>]*>/g, "").trim() ? (
          <PreviewSection title="Professional summary" key={key}>
            <div
              className="text-[11px] text-neutral-700 [&_li]:ml-4 [&_li]:list-disc"
              dangerouslySetInnerHTML={{ __html: s.summary }}
            />
          </PreviewSection>
        ) : null;
      case "employment":
        return s.employment.some((e) => e.jobTitle || e.company) ? (
          <PreviewSection title="Employment history" key={key}>
            {s.employment.map((e) => (
              <div key={e.id} className="text-[11px] text-neutral-700">
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
                    dangerouslySetInnerHTML={{ __html: e.description }}
                  />
                )}
              </div>
            ))}
          </PreviewSection>
        ) : null;
      case "skills":
        return s.skills.some((sk) => sk.name) ? (
          <PreviewSection title="Skills" key={key}>
            <p className="text-[11px] text-neutral-700">
              {s.skills
                .filter((sk) => sk.name)
                .map((sk) => sk.name)
                .join(", ")}
            </p>
          </PreviewSection>
        ) : null;
      case "education":
        return s.education.some((e) => e.institution || e.degree) ? (
          <PreviewSection title="Education" key={key}>
            {s.education.map((e) => (
              <div key={e.id} className="text-[11px] text-neutral-700">
                <div className="flex justify-between font-semibold text-neutral-900">
                  <span>{e.degree || e.institution}</span>
                  <span className="font-normal text-neutral-500">
                    {dateRange(e.startDate, e.endDate)}
                  </span>
                </div>
                {(e.institution || e.location) && (
                  <p className="italic text-neutral-500">
                    {[e.institution, e.location].filter(Boolean).join(", ")}
                  </p>
                )}
              </div>
            ))}
          </PreviewSection>
        ) : null;
      default:
        return null;
    }
  };

  const twoCol = design.columns !== "centered";
  const mainKeys = twoCol
    ? s.sectionOrder.filter((k) => !isSidebar(k, s.additional))
    : s.sectionOrder;
  const sidebarKeys = twoCol
    ? s.sectionOrder.filter((k) => isSidebar(k, s.additional))
    : [];

  const header = (
    <header className="flex items-start gap-4">
      {s.personal.photo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={s.personal.photo}
          alt=""
          className="size-17 shrink-0 rounded-full object-cover"
        />
      )}
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          {fullName}
        </h1>
        {s.personal.jobTitle && (
          <p className="text-sm" style={{ color: accent }}>
            {s.personal.jobTitle}
          </p>
        )}
        {contactLine && (
          <p className="mt-1.5 text-[11px] text-neutral-600">{contactLine}</p>
        )}
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
        style={fontStyle}
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
      className="w-full px-12 py-11 text-neutral-900"
      style={fontStyle}
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
