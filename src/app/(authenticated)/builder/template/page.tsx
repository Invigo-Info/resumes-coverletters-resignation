import Link from "next/link";
import { LogoMark } from "@/components/common/brand/logo-mark";
import { PageShell } from "@/components/layout/page-shell";
import { HelpPill } from "@/components/layout/help-pill";
import { BackPill } from "@/components/layout/back-pill";
import { TemplateGallery } from "@/features/resume-builder/components/templates/template-gallery";

// Template picker page: lets the user choose an ATS-friendly resume template
// before (or while) building. Selection can be changed again later.
export default function TemplateGalleryPage() {
  return (
    <PageShell>
      <div className="absolute left-6 top-6">
        <Link href="/" aria-label="resumewriter.ai home">
          <LogoMark />
        </Link>
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-20 pt-24 sm:px-6">
        <header className="mb-10 text-center">
          <p className="eyebrow mb-2.5">New resume · step 2 of 2</p>
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Choose your resume template
          </h1>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            Clean, ATS-friendly layouts. Pick one to start - you can switch
            anytime.
          </p>
        </header>

        <TemplateGallery />
      </div>

      <BackPill />
      <HelpPill />
    </PageShell>
  );
}
