"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Send, Plus, Settings, CircleHelp, LogOut, LayoutDashboard } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { LogoMark } from "@/components/brand/logo-mark";
import { useResumeLimit } from "@/permissions/resume-limit";
import { cn } from "@/utilities/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Primary section tabs shown in the top navigation bar. */
const TABS = [
  { label: "Resumes", href: "/" },
  { label: "Cover letters", href: "/cover-letters" },
  { label: "Resignation letters", href: "/resignation-letters" },
  { label: "Jobs", href: "/jobs" },
  { label: "Interview prep", href: "/interview-prep" },
];

/**
 * Sticky dashboard header: logo, section tabs, subscribe link, the account
 * dropdown (settings/support/sign-out) and the Create document menu.
 */
export function TopNav({ active = "Resumes" }: { active?: string }) {
  const router = useRouter();
  const { atLimit } = useResumeLimit();
  const { data: session } = useSession();
  // Free accounts past the resume cap go straight to the subscribe page.
  const newResumeHref = atLimit ? "/payment" : "/resume-creation-menu";
  const email = session?.user?.email ?? "";
  // Avatar shows the first letter of the signed-in email (fallback to name).
  const initial = (email || session?.user?.name || "").trim().charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur-sm print:hidden">
      <div className="mx-auto flex h-16 w-full items-center gap-6 px-4 sm:px-6 lg:px-10">
        {/* Left: logo + tabs */}
        <Link href="/" aria-label="resumewriter.ai home">
          <LogoMark withWordmark={false} className="size-7" />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {TABS.map((tab) => {
            const isActive = tab.label === active;
            return (
              <Link
                key={tab.label}
                href={tab.href}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        {/* Right: subscribe, avatar, create */}
        <div className="ml-auto flex items-center gap-4">
          <Link
            href="/payment"
            className="hidden items-center gap-1.5 text-sm font-semibold text-primary hover:opacity-80 sm:flex"
          >
            <Send className="size-4 -rotate-45" />
            Subscribe now
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger
              className="grid size-9 place-items-center rounded-full bg-brand-teal text-sm font-semibold uppercase text-white outline-none transition-transform motion-safe:hover:scale-105 focus-visible:ring-3 focus-visible:ring-ring/40"
              aria-label="Account menu"
            >
              {initial}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-56">
              {email && (
                <>
                  <div className="px-2 py-1.5">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {session?.user?.name || email.split("@")[0]}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{email}</p>
                  </div>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={() => router.push("/dashboard")}>
                <LayoutDashboard className="size-4 text-muted-foreground" />
                Dashboard
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/account")}>
                <Settings className="size-4 text-muted-foreground" />
                Account settings
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => window.open("mailto:support@resumewriter.ai", "_self")}
              >
                <CircleHelp className="size-4 text-muted-foreground" />
                Help &amp; support
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
                <LogOut className="size-4 text-muted-foreground" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm outline-none transition-colors hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/40">
              <Plus className="size-4" />
              Create
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-52">
              <DropdownMenuItem onClick={() => router.push(newResumeHref)}>
                New resume
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/cover-letter/new")}>
                New cover letter
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/resignation-letters/write/heading")}>
                New resignation letter
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
