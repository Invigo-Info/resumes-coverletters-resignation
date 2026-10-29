"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Mail,
  Briefcase,
  Mic,
  Settings,
  Sparkles,
  CircleHelp,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { LogoMark } from "@/components/common/brand/logo-mark";
import { cn } from "@/utilities/utils";

/** Primary destinations shown in the dashboard sidebar (real app routes). */
const NAV: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Resumes", href: "/", icon: FileText },
  { label: "Cover Letters", href: "/cover-letters", icon: Mail },
  { label: "Job Search", href: "/jobs", icon: Briefcase },
  { label: "Interview Prep", href: "/interview-prep", icon: Mic },
  { label: "Settings", href: "/account", icon: Settings },
];

/** The sidebar's inner content (profile, nav, upsell, help). Reused by the
 *  fixed desktop rail and the mobile slide-over. */
function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const email = session?.user?.email ?? "";
  const name = session?.user?.name || (email ? email.split("@")[0] : "Your account");
  const initial = (email || name).trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="flex h-full flex-col gap-1 p-3">
      {/* Account identity */}
      <div className="flex items-center gap-3 rounded-2xl px-2 py-2">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-teal text-sm font-semibold uppercase text-white">
          {initial}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-foreground">{name}</span>
          {email && (
            <span className="block truncate text-xs text-muted-foreground">{email}</span>
          )}
        </span>
      </div>

      {/* Primary nav */}
      <nav className="mt-1 flex flex-col gap-0.5">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-primary/10 font-semibold text-primary"
                  : "font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Icon className="size-5 shrink-0" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      {/* AI upsell */}
      <div className="rounded-2xl bg-primary/5 p-4 ring-1 ring-primary/10">
        <span className="grid size-9 place-items-center rounded-xl bg-card text-(--ai-text) shadow-sm ring-1 ring-border">
          <Sparkles className="size-5" aria-hidden />
        </span>
        <p className="mt-3 text-sm font-bold text-foreground">Unlock unlimited tailoring</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Match every application to its posting in one click.
        </p>
        <Link
          href="/payment"
          onClick={onNavigate}
          className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-[10px] bg-(--brand-blue) px-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-(--brand-blue)"
        >
          Subscribe now
        </Link>
      </div>

      {/* Help */}
      <a
        href="mailto:support@resumewriter.ai"
        className="mt-1 flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <CircleHelp className="size-5 shrink-0" aria-hidden />
        Help and support
      </a>
    </div>
  );
}

/**
 * Dashboard-only app shell: a full-width top bar (logo + Upgrade) over a fixed
 * left sidebar and the scrolling content column. The sidebar collapses to a
 * slide-over on small screens. Scoped to the dashboard page - other routes keep
 * their own top-nav chrome.
 */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 sm:px-6 print:hidden">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="grid size-9 place-items-center rounded-[10px] text-foreground transition-colors hover:bg-secondary lg:hidden"
          >
            <Menu className="size-5" />
          </button>
          <Link href="/" aria-label="resumewriter.ai home" className="flex items-center">
            <LogoMark withWordmark className="size-8" />
          </Link>
        </div>
        <Link
          href="/payment"
          className="inline-flex h-10 items-center rounded-[10px] bg-foreground px-5 text-sm font-semibold text-background shadow-sm transition-colors hover:bg-foreground/90"
        >
          Upgrade
        </Link>
      </header>

      <div className="flex flex-1 overflow-hidden print:block print:overflow-visible">
        {/* Desktop sidebar */}
        <aside className="hidden w-64 shrink-0 border-r border-border bg-card lg:block print:hidden">
          <div className="sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
            <SidebarBody />
          </div>
        </aside>

        {/* Mobile slide-over */}
        {drawerOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="absolute inset-0 bg-foreground/40"
              onClick={() => setDrawerOpen(false)}
              aria-hidden
            />
            <div className="absolute inset-y-0 left-0 w-72 max-w-[85%] bg-card shadow-card-lg">
              <div className="flex h-14 items-center justify-between px-4">
                <LogoMark withWordmark className="size-7" />
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close menu"
                  className="grid size-9 place-items-center rounded-[10px] text-foreground transition-colors hover:bg-secondary"
                >
                  <X className="size-5" />
                </button>
              </div>
              <div className="h-[calc(100%-3.5rem)] overflow-y-auto">
                <SidebarBody onNavigate={() => setDrawerOpen(false)} />
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 overflow-y-auto print:overflow-visible">{children}</main>
      </div>
    </div>
  );
}
