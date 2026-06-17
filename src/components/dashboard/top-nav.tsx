"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Send, Plus, Settings, CircleHelp, LogOut } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { LogoMark } from "@/components/brand/logo-mark";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const TABS = [
  { label: "Resumes", href: "/" },
  { label: "Cover letters", href: "/cover-letters" },
  { label: "Resignation letters", href: "/resignation-letters" },
  { label: "Jobs", href: "#" },
];

export function TopNav({ active = "Resumes" }: { active?: string }) {
  const router = useRouter();
  const { data: session } = useSession();
  const email = session?.user?.email ?? "";
  // Avatar shows the first letter of the signed-in email (fallback to name).
  const initial = (email || session?.user?.name || "").trim().charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 w-full items-center gap-6 px-4 sm:px-6 lg:px-10">
        {/* Left: logo + tabs */}
        <Link href="/" aria-label="resume.co home">
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
              className="grid size-9 place-items-center rounded-full bg-[#D2451E] text-sm font-semibold uppercase text-white outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
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
              <DropdownMenuItem onClick={() => router.push("/account")}>
                <Settings className="size-4 text-muted-foreground" />
                Account settings
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => window.open("mailto:support@resume.co", "_self")}
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
              <DropdownMenuItem
                onClick={() => router.push("/resume-creation-menu")}
              >
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
