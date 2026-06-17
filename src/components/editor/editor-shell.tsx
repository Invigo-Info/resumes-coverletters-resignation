"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, Eye, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useResumeStore, type SectionKey } from "@/lib/store/resume-store";
import { useResumeAutosave } from "@/lib/store/documents-store";
import {
  RESUME_WRITE_BASE,
  resumeKeyFromSlug,
  resumeSlugFromKey,
} from "@/lib/section-routes";
import { HelpPill } from "@/components/layout/help-pill";
import { TopBar, type EditorTab } from "./top-bar";
import { SectionNav } from "./section-nav";
import { MobileSectionBar } from "./mobile-section-bar";
import { SectionFooter } from "./section-footer";
import { LivePreview } from "./live-preview";
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
        onReorder={() => setActive("reorder")}
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
  // (not a user click) — so the store->URL effect below doesn't fire a spurious
  // router.replace with the stale section and cause the page to flip/blink.
  const syncingFromUrl = useRef(false);

  useEffect(() => {
    if (templateId) applyTemplate(templateId);
  }, [templateId, applyTemplate]);

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
        <TopBar tab={tab} onTabChange={setTab} />

        {tab === "write" && (
          <div className="flex gap-6 px-4 pb-16">
            {/* Left nav */}
            <aside className="hidden w-64 shrink-0 lg:block">
              <SectionNav
                onAddSection={() => setActive("additional")}
                onReorder={() => setActive("reorder")}
              />
            </aside>

            {/* Center form */}
            <main className="min-w-0 flex-1">
              <MobileSectionBar onAdd={() => setActive("additional")} />
              <div className="rounded-3xl bg-card p-6 shadow-card ring-1 ring-border sm:p-9">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={active}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                  >
                    <ActiveSectionForm onFinish={() => setTab("improve")} />
                  </motion.div>
                </AnimatePresence>
                {active !== "reorder" && active !== "additional" && (
                  <SectionFooter
                    onReorder={() => setActive("reorder")}
                    onComplete={() => setTab("design")}
                  />
                )}
              </div>
            </main>

            {/* Right preview */}
            <section className="hidden min-w-0 flex-1 xl:block">
              <div className="relative min-h-[calc(100vh-7rem)] rounded-2xl bg-white shadow-card-lg ring-1 ring-border">
                <LivePreview />
                <span className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
                  <CircleCheck className="size-3.5" />
                  Saved
                </span>
              </div>
            </section>
          </div>
        )}

        {tab === "design" && (
          <div className="flex gap-6 px-4 pb-16">
            <aside className="w-full shrink-0 lg:w-[380px]">
              <DesignPanel onBack={() => setTab("write")} />
            </aside>
            <section className="hidden min-w-0 flex-1 lg:block">
              <div className="relative min-h-[calc(100vh-7rem)] rounded-2xl bg-white shadow-card-lg ring-1 ring-border">
                <LivePreview />
                <span className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
                  <CircleCheck className="size-3.5" />
                  Saved
                </span>
              </div>
            </section>
          </div>
        )}
        {tab === "improve" && (
          <div className="flex gap-6 px-4 pb-16">
            <main className="min-w-0 flex-1 lg:max-w-2xl">
              <div className="rounded-3xl bg-card p-7 shadow-card ring-1 ring-border sm:p-9">
                <ImprovePanel
                  onNavigate={(sec) => {
                    setActive(sec);
                    setTab("write");
                  }}
                  onBack={() => setTab("design")}
                />
              </div>
            </main>
            <section className="hidden min-w-0 flex-1 xl:block">
              <div className="relative min-h-[calc(100vh-7rem)] rounded-2xl bg-[#EFF4FF] shadow-card-lg ring-1 ring-border">
                <LivePreview />
                <span className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                  <CircleCheck className="size-3.5" />
                  Saved
                </span>
              </div>
            </section>
          </div>
        )}
      </div>

      {/* Mobile preview toggle (no side-by-side preview on small screens) */}
      <button
        onClick={() => setMobilePreview(true)}
        className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background shadow-card-lg xl:hidden"
      >
        <Eye className="size-4" />
        Preview
      </button>

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
