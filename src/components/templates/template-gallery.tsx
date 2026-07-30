"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Brush,
  Sparkles,
  FileText,
  Briefcase,
  GraduationCap,
  Check,
  Eye,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  useResumeStore,
  previewStateFromDoc,
  designForTemplate,
  type ResumeState,
} from "@/lib/store/resume-store";
import { MOCK_RESUME } from "@/lib/ai/parseResume";
import { ScaledResumePreview } from "@/components/editor/scaled-resume-preview";
import {
  templates,
  templateTabs,
  isAtsFriendly,
  DEFAULT_TEMPLATE_ID,
  type ResumeTemplate,
  type TemplateCategory,
} from "@/lib/templates";

/**
 * A live thumbnail of ONE template style, rendering the canned sample resume in
 * that template's design (black by default, per `designForTemplate`). Renders
 * exactly what the editor produces when the template is selected, so the picker
 * matches the result. Fills its relatively-positioned parent.
 */
function GalleryThumbnail({ templateId }: { templateId: string }) {
  const state = useMemo<ResumeState>(() => {
    const base = previewStateFromDoc({ ...MOCK_RESUME, templateId });
    return { ...base, design: designForTemplate(base.design, templateId) };
  }, [templateId]);
  return <ScaledResumePreview state={state} />;
}

/** Per-tab leading icon keyed by category label (never an emoji). */
const TAB_ICON: Record<string, LucideIcon> = {
  "All templates": Brush,
  "ATS-friendly": Sparkles,
  Simple: FileText,
  Professional: Briefcase,
  Student: GraduationCap,
};

/**
 * Template picker grid with category tabs. This is a quick decision step, not a
 * design tool: one template is pre-selected, two are tagged "Recommended", and
 * clicking any card goes straight to the editor seeded with that template.
 */
export function TemplateGallery() {
  const router = useRouter();
  const chosen = useResumeStore((s) => s.templateId);
  const [active, setActive] = useState<(typeof templateTabs)[number]>(
    "All templates"
  );
  // Default selection: whatever the user already picked, else the house pick.
  const [selected, setSelected] = useState(chosen || DEFAULT_TEMPLATE_ID);
  const [preview, setPreview] = useState<{ template: ResumeTemplate } | null>(null);

  // Templates shown for the active tab ("All" shows everything; otherwise
  // filter by category). Memoized so the list only recomputes when the tab
  // changes. The gallery order is fixed - the "Recommended" tag does the
  // guiding, so the grid doesn't reshuffle under the user.
  const visible = useMemo(() => {
    if (active === "All templates") return templates;
    return templates.filter((t) =>
      t.categories.includes(active as TemplateCategory)
    );
  }, [active]);

  /** Select a template and move straight to the builder (no confirmation step). */
  function use(t: ResumeTemplate) {
    setSelected(t.id);
    setPreview(null);
    router.push(`/resumes/write/personal?template=${t.id}`);
  }

  return (
    <div className="space-y-8">
      {/* Category tabs */}
      <div role="tablist" aria-label="Template categories" className="flex flex-wrap justify-center gap-2">
        {templateTabs.map((tab) => {
          const isActive = tab === active;
          const Icon = TAB_ICON[tab];
          return (
            <button
              key={tab}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(tab)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                "outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
                isActive
                  ? "bg-foreground text-background"
                  : "bg-card text-muted-foreground shadow-card hover:text-foreground"
              )}
            >
              <Icon className="size-4" aria-hidden />
              {tab}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((t) => (
          <TemplateCard
            key={t.id}
            template={t}
            selected={t.id === selected}
            onUse={() => use(t)}
            onPreview={() => setPreview({ template: t })}
          />
        ))}
      </div>

      <PreviewModal
        preview={preview}
        onClose={() => setPreview(null)}
        onUse={(t) => use(t)}
      />
    </div>
  );
}

/** One template in the grid: preview, badges, hover CTA, name and usage count. */
function TemplateCard({
  template: t,
  selected,
  onUse,
  onPreview,
}: {
  template: ResumeTemplate;
  selected: boolean;
  onUse: () => void;
  onPreview: () => void;
}) {
  return (
    <div className="space-y-3">
      <div
        className={cn(
          "group relative overflow-hidden rounded-xl bg-card shadow-card ring-1 transition-all duration-200",
          "hover:-translate-y-1 hover:shadow-card-lg",
          selected ? "ring-2 ring-primary" : "ring-border hover:ring-primary/30"
        )}
      >
        {/* The whole preview is the select target. */}
        <button
          type="button"
          onClick={onUse}
          aria-label={`Use the ${t.name} template`}
          className="block w-full outline-none"
        >
          <div className="relative aspect-[210/297] w-full overflow-hidden bg-white">
            <GalleryThumbnail templateId={t.id} />
          </div>

          {/* Hover / keyboard-focus overlay with the primary CTA. */}
          <span
            className={cn(
              "absolute inset-0 flex items-center justify-center bg-foreground/5 opacity-0 backdrop-blur-[1px] transition-opacity",
              "group-hover:opacity-100 group-focus-within:opacity-100"
            )}
          >
            <span className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg">
              Use this template
            </span>
          </span>
        </button>

        {/* Badges. Pointer-events off so they never block the select target. */}
        <div className="pointer-events-none absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
          {t.recommended && (
            <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground shadow-sm">
              Recommended
            </span>
          )}
          {isAtsFriendly(t) && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#ecfdf5] px-2.5 py-1 text-xs font-semibold text-[#065f46] shadow-sm">
              <ShieldCheck className="size-3.5" aria-hidden />
              ATS-friendly
            </span>
          )}
        </div>

        {/* Selected marker (the pre-selected default, or the user's last pick). */}
        {selected && (
          <span
            className="pointer-events-none absolute right-2.5 top-2.5 grid size-7 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm"
            aria-hidden
          >
            <Check className="size-4" />
          </span>
        )}

        {/* Full-screen preview, kept out of the select button (no nested buttons). */}
        <button
          type="button"
          onClick={onPreview}
          aria-label={`Preview the ${t.name} template`}
          className={cn(
            "absolute bottom-2.5 right-2.5 inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-card ring-1 ring-border",
            "opacity-0 transition-opacity hover:bg-secondary group-hover:opacity-100 focus-visible:opacity-100",
            "outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
          )}
        >
          <Eye className="size-3.5" aria-hidden />
          Preview
        </button>
      </div>

      <div className="px-1">
        <p className="text-sm font-semibold text-foreground">
          {t.name}
          {selected && (
            <span className="ml-2 text-xs font-medium text-primary">Selected</span>
          )}
        </p>
        <p className="text-xs text-muted-foreground">Used {t.used} times</p>
      </div>
    </div>
  );
}

/** Full-screen preview of a single template, with the CTA repeated. */
function PreviewModal({
  preview,
  onClose,
  onUse,
}: {
  preview: { template: ResumeTemplate } | null;
  onClose: () => void;
  onUse: (t: ResumeTemplate) => void;
}) {
  const t = preview?.template ?? null;
  return (
    <Dialog open={!!t} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-2xl p-5 sm:max-w-lg">
        {t && preview && (
          <>
            <DialogTitle className="font-heading text-xl font-extrabold tracking-tight text-foreground">
              {t.name}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {isAtsFriendly(t)
                ? "Parses cleanly in applicant tracking systems."
                : "A designed layout with more visual character."}{" "}
              Used {t.used} times.
            </DialogDescription>

            <div className="relative mt-2 aspect-[210/297] w-full overflow-hidden rounded-xl bg-white ring-1 ring-border">
              <GalleryThumbnail templateId={t.id} />
            </div>

            <button
              type="button"
              onClick={() => onUse(t)}
              className="mt-2 h-12 w-full rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              Use this template
            </button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
