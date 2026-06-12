import Link from "next/link";
import { LogoMark } from "@/components/brand/logo-mark";
import { PageShell } from "@/components/layout/page-shell";
import { HelpPill } from "@/components/layout/help-pill";
import { TemplateGallery } from "@/components/templates/template-gallery";

export default function TemplateGalleryPage() {
  return (
    <PageShell>
      <div className="absolute left-6 top-6">
        <Link href="/dashboard" aria-label="resume.co home">
          <LogoMark />
        </Link>
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-20 pt-24 sm:px-6">
        <header className="mb-10 text-center">
          <h1 className="font-heading text-4xl font-extrabold tracking-tight text-foreground">
            Select an ATS-friendly resume template
          </h1>
          <p className="mt-3 text-muted-foreground">
            Choose the design that fits your style. You can change it later.
          </p>
        </header>

        <TemplateGallery />
      </div>

      <HelpPill />
    </PageShell>
  );
}
