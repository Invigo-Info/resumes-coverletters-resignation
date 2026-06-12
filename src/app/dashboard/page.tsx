import Link from "next/link";
import { Plus } from "lucide-react";
import { TopNav } from "@/components/dashboard/top-nav";
import { ResumeCard } from "@/components/dashboard/resume-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { SiteFooter } from "@/components/dashboard/site-footer";
import { HelpPill } from "@/components/layout/help-pill";
import { GhostButton } from "@/components/brand/brand-buttons";
import { mockResumes } from "@/lib/mock-data";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ filled?: string }>;
}) {
  // Empty state is the default landing view; ?filled=1 previews the saved-resume card.
  const { filled } = await searchParams;
  const resumes = filled === "1" ? mockResumes : [];
  const hasResumes = resumes.length > 0;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopNav active="Resumes" />

      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
          {hasResumes ? (
            <div className="space-y-7">
              {resumes.map((resume) => (
                <ResumeCard key={resume.id} resume={resume} />
              ))}
              <div className="flex justify-center">
                <Link href="/resume-creation-menu">
                  <GhostButton className="bg-card shadow-card hover:bg-card">
                    <Plus className="size-4" />
                    Create new resume
                  </GhostButton>
                </Link>
              </div>
            </div>
          ) : (
            <EmptyState />
          )}
        </div>
      </main>

      <SiteFooter />
      <HelpPill />
    </div>
  );
}
