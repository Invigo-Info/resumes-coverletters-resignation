import Link from "next/link";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/brand/logo-mark";
import { SiteFooter } from "@/features/dashboard/components/site-footer";

/**
 * Shared chrome for the legal pages (Terms, Privacy): brand header linking home,
 * a readable prose column, a "template - review with a lawyer" notice, and the
 * site footer. Child content is plain semantic HTML; the container styles the
 * headings / paragraphs / lists so pages stay easy to edit.
 */
export function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="px-5 py-6 sm:px-8">
        <Link href="/" aria-label="resumewriter.ai home" className="inline-block">
          <LogoMark />
        </Link>
      </header>

      <main className="flex-1 px-5 pb-20 sm:px-8">
        <div className="mx-auto max-w-[68ch]">
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Last updated: {updated}
          </p>

          <div className="mt-6 rounded-xl border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
            <strong className="text-foreground">Template for review:</strong>{" "}
            this document is a starting point, not legal advice. Have a qualified
            attorney review and adapt it (including company details, governing
            law, and the contact address) before launch.
          </div>

          <div
            className="mt-8 text-foreground [&_a]:text-primary [&_a]:underline [&_h2]:mt-10 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_h3]:mt-6 [&_h3]:mb-1 [&_h3]:font-semibold [&_li]:mt-1 [&_p]:mt-3 [&_p]:leading-relaxed [&_p]:text-muted-foreground [&_strong]:text-foreground [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:text-muted-foreground"
          >
            {children}
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
