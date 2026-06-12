"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Send, Plus } from "lucide-react";
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
  { label: "Resumes", href: "/dashboard" },
  { label: "Cover letters", href: "/cover-letters" },
  { label: "Resignation letters", href: "/resignation-letters" },
  { label: "Jobs", href: "#" },
];

export function TopNav({ active = "Resumes" }: { active?: string }) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        {/* Left: logo + tabs */}
        <Link href="/dashboard" aria-label="resume.co home">
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
          <button className="hidden items-center gap-1.5 text-sm font-semibold text-primary hover:opacity-80 sm:flex">
            <Send className="size-4 -rotate-45" />
            Subscribe now
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger
              className="grid size-9 place-items-center rounded-full bg-[#D2451E] text-sm font-semibold text-white outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
              aria-label="Account menu"
            >
              J
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-48">
              <DropdownMenuItem>Account</DropdownMenuItem>
              <DropdownMenuItem>Help &amp; support</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive">Logout</DropdownMenuItem>
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
              <DropdownMenuItem onClick={() => router.push("/resignation-letter/builder")}>
                New resignation letter
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
