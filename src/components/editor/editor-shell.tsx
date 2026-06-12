"use client";

import { useEffect, useState } from "react";
import { CircleCheck, Eye, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useResumeStore } from "@/lib/store/resume-store";
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

export function EditorShell({ templateId }: { templateId?: string }) {
  const [tab, setTab] = useState<EditorTab>("write");
  const [mobilePreview, setMobilePreview] = useState(false);
  const applyTemplate = useResumeStore((s) => s.applyTemplate);
  const setActive = useResumeStore((s) => s.setActiveSection);
  const active = useResumeStore((s) => s.activeSection);

  useEffect(() => {
    if (templateId) applyTemplate(templateId);
  }, [templateId, applyTemplate]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1500px]">
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
                  <SectionFooter onReorder={() => setActive("reorder")} />
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
                  onBack={() => setTab("write")}
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
