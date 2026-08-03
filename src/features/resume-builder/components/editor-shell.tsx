"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useResumeStore, type SectionKey } from "@/features/resume-builder/store/resume-store";
import { useResumeAutosave } from "@/features/resume-builder/store/documents-store";
import {
  RESUME_WRITE_BASE,
  resumeKeyFromSlug,
  resumeSlugFromKey,
} from "@/utilities/section-routes";
import { downloadResume } from "@/services/storage/download-pdf";
import { HelpPill } from "@/components/layout/help-pill";
import { TopBar, type EditorTab } from "./top-bar";
import { SectionNav } from "./section-nav";
import { SectionFooter } from "./section-footer";
import { LivePreview } from "./live-preview";
import { PreviewPane } from "./preview-pane";
import { PersonalDetailsForm } from "./sections/personal-details";
import { ContactInformationForm } from "./sections/contact-information";
import { EmploymentHistoryForm } from "./sections/employment-history";
import { SkillsForm } from "./sections/skills";
import { EducationForm } from "./sections/education";
import { ProfessionalSummaryForm } from "./sections/professional-summary";
import { AdditionalPicker } from "./sections/additional-picker";
import { AdditionalSectionForm } from "./sections/additional-section";
import { ReorderSections } from "./sections/reorder-sections";
import { DesignPanel } from "./design-panel";
import { ImprovePanel } from "./improve-panel";

/**
 * Renders the form for the currently active write step. Routes the special
 * "reorder" and "additional" keys to their flows, then matches user-added
 * sections by id, and finally the built-in section forms - defaulting to Personal.
 */
function ActiveSectionForm({ onFinish }: { onFinish: () => void }) {
  const active = useResumeStore((s) => s.activeSection);
  const additional = useResumeStore((s) => s.additional);
  const order = useResumeStore((s) => s.sectionOrder);
  const setActive = useResumeStore((s) => s.setActiveSection);

  if (active === "reorder")
    return (
      <ReorderSections
        onAddSection={() => setActive("additional")}
        onDone={() => setActive("personal")}
      />
    );

  if (active === "additional")
    return (
      <AdditionalPicker
        onBack={() => setActive(order[order.length - 1])}
        onNext={onFinish}
      />
    );

  const addSection = additional.find((a) => a.id === active);
  if (addSection) return <AdditionalSectionForm section={addSection} />;

  switch (active) {
    case "personal":
      return <PersonalDetailsForm />;
    case "contact":
      return <ContactInformationForm />;
    case "summary":
      return <ProfessionalSummaryForm />;
    case "employment":
      return <EmploymentHistoryForm />;
    case "skills":
      return <SkillsForm />;
    case "education":
      return <EducationForm />;
    default:
      return <PersonalDetailsForm />;
  }
}

/**
 * Top-level editor layout. Owns the active tab (Write/Design/Improve) and the
 * mobile preview sheet, wires up autosave, optionally applies a starter template,
 * and keeps the active write section in two-way sync with the URL when routed.
 */
export function EditorShell({
  templateId,
  routedSection,
}: {
  templateId?: string;
  /** When set, the write step is driven by (and kept in sync with) the URL. */
  routedSection?: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<EditorTab>("write");
  const [mobilePreview, setMobilePreview] = useState(false);
  const applyTemplate = useResumeStore((s) => s.applyTemplate);
  const setActive = useResumeStore((s) => s.setActiveSection);
  const active = useResumeStore((s) => s.activeSection);

  // Persist the working resume into the dashboard's drafts list.
  useResumeAutosave();

  // True for the one render where `active` changed because the URL synced it
  // (not a user click) - so the store->URL effect below doesn't fire a spurious
  // router.replace with the stale section and cause the page to flip/blink.
  const syncingFromUrl = useRef(false);

  useEffect(() => {
    if (templateId) applyTemplate(templateId);
  }, [templateId, applyTemplate]);

  // Auto-download when arriving from the dashboard card's Download (a premium
  // user - the paywall was already cleared there). The intent is passed via a
  // sessionStorage flag rather than a URL query, because the URL<->store sync
  // effect below rewrites the path on mount and would strip a query before we
  // could read it. We consume the flag once, wait for the preview to mount and
  // web fonts to settle, then export the PDF.
  // Consume the flag and guard synchronously (a ref + the sessionStorage removal
  // both survive React StrictMode's dev double-invoke), then let this one-shot
  // export run to completion - deliberately no cleanup-cancel, which would abort
  // the download under StrictMode.
  const didAutoDownload = useRef(false);
  useEffect(() => {
    if (didAutoDownload.current || typeof window === "undefined") return;
    if (sessionStorage.getItem("resume-co:dl") !== "1") return;
    sessionStorage.removeItem("resume-co:dl");
    didAutoDownload.current = true;
    void (async () => {
      for (let i = 0; i < 50; i++) {
        if (document.querySelector("[data-resume-preview]")) break;
        await new Promise((r) => setTimeout(r, 100));
      }
      try {
        await document.fonts?.ready;
      } catch {
        /* fonts API absent - proceed anyway */
      }
      await new Promise((r) => setTimeout(r, 350));
      await downloadResume();
    })();
  }, []);

  // URL -> store: the section slug in the path selects the active write step.
  useEffect(() => {
    if (!routedSection) return;
    const key = resumeKeyFromSlug(routedSection);
    if (key && key !== useResumeStore.getState().activeSection) {
      syncingFromUrl.current = true;
      setActive(key as SectionKey);
    }
    setTab("write");
  }, [routedSection, setActive]);

  // store -> URL: while writing, reflect the active step back into the path so
  // every section is a shareable, refresh-safe URL. Skip the push when the
  // active change originated from the URL (the line above).
  useEffect(() => {
    if (!routedSection || tab !== "write") return;
    if (syncingFromUrl.current) {
      syncingFromUrl.current = false;
      return;
    }
    const slug = resumeSlugFromKey(active);
    if (slug && slug !== routedSection) {
      router.replace(`${RESUME_WRITE_BASE}/${slug}`);
    }
  }, [active, tab, routedSection, router]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1800px]">
        <TopBar
          tab={tab}
          onTabChange={setTab}
          onPreview={() => setMobilePreview(true)}
        />

        {tab === "write" && (
          <div className="flex gap-6 px-4 pb-28">
            {/* Left nav */}
            <aside className="hidden w-64 shrink-0 lg:block">
              <SectionNav
                onAddSection={() => setActive("additional")}
                onReorder={() => setActive("reorder")}
              />
            </aside>

            {/* Center form */}
            <main className="min-w-0 flex-1">
              {/* Match the preview's height so switching steps (which have
                  different content heights) doesn't resize the page and jump. */}
              <div className="rounded-3xl bg-card p-6 shadow-card ring-1 ring-border sm:p-9 lg:min-h-[calc(100vh-7rem)]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={active}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    {/* Additional section is the last Write step, so its Next
                        hands off to Design - the destination the old
                        "Next: Design" button on Professional summary had. */}
                    <ActiveSectionForm onFinish={() => setTab("design")} />
                  </motion.div>
                </AnimatePresence>
                {active !== "reorder" && active !== "additional" && (
                  <SectionFooter />
                )}
              </div>
            </main>

            {/* Right preview */}
            <section className="hidden min-w-0 flex-1 xl:block">
              <PreviewPane paneClassName="bg-white" />
            </section>
          </div>
        )}

        {tab === "design" && (
          <div className="flex gap-6 px-4 pb-28">
            <aside className="w-full shrink-0 lg:w-130 xl:w-150">
              <DesignPanel
                onBack={() => setTab("write")}
                onNext={() => setTab("improve")}
              />
            </aside>
            <section className="hidden min-w-0 flex-1 lg:block">
              {/* Design tab is view-only: render without editor highlights so the
                  theme's real header colors show (not the blue active-section
                  outline that would otherwise paint the name + contact line). */}
              <PreviewPane paneClassName="bg-white" zoom={1.2} previewOnly />
            </section>
          </div>
        )}
        {tab === "improve" && (
          <div className="flex gap-6 px-4 pb-28">
            <main className="min-w-0 flex-1 lg:max-w-2xl">
              <div className="rounded-3xl bg-card p-7 shadow-card ring-1 ring-border sm:p-9">
                <ImprovePanel
                  onNavigate={(sec) => {
                    setActive(sec);
                    setTab("write");
                  }}
                  onBack={() => setTab("design")}
                  onNext={() => setTab("design")}
                />
              </div>
            </main>
            <section className="hidden min-w-0 flex-1 xl:block">
              <PreviewPane paneClassName="bg-white" previewOnly />
            </section>
          </div>
        )}
      </div>

      {/* Mobile preview sheet (no side-by-side preview on small screens). Opened
          from the top bar's Preview button so the bottom section bar keeps only
          Back / progress-dots / Next. */}
      <AnimatePresence>
        {mobilePreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col bg-black/50 xl:hidden"
            onClick={() => setMobilePreview(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "tween", duration: 0.25 }}
              onClick={(e) => e.stopPropagation()}
              className="mt-auto max-h-[88vh] overflow-y-auto rounded-t-3xl bg-white"
            >
              <div className="sticky top-0 flex items-center justify-between border-b border-border bg-white px-5 py-3">
                <span className="font-semibold">Preview</span>
                <button
                  onClick={() => setMobilePreview(false)}
                  aria-label="Close preview"
                  className="grid size-8 place-items-center rounded-lg hover:bg-muted"
                >
                  <X className="size-4" />
                </button>
              </div>
              <LivePreview />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <HelpPill />
    </div>
  );
}
