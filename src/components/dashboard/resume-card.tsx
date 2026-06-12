"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Download, Sparkles } from "lucide-react";
import type { ResumeDoc } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { TailorDialog } from "./tailor-dialog";

function ActionButton({
  children,
  className,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-secondary px-4 py-2 text-sm font-medium text-foreground transition-colors",
        "hover:bg-[color-mix(in_oklab,var(--secondary),black_4%)]",
        disabled && "cursor-not-allowed text-muted-foreground opacity-60 hover:bg-secondary",
        className
      )}
    >
      {children}
    </button>
  );
}

export function ResumeCard({ resume }: { resume: ResumeDoc }) {
  const router = useRouter();
  const [tailorOpen, setTailorOpen] = useState(false);

  return (
    <div className="rounded-3xl bg-card p-3 shadow-card-lg">
      <div className="flex flex-col gap-5 p-4 sm:flex-row sm:gap-7">
        {/* Thumbnail */}
        <div className="shrink-0 overflow-hidden rounded-lg ring-1 ring-border">
          <Image
            src={resume.thumb}
            alt={`${resume.title} preview`}
            width={150}
            height={200}
            className="h-[200px] w-[150px] object-cover"
          />
        </div>

        {/* Details + actions */}
        <div className="flex flex-1 flex-col">
          <h2 className="text-lg font-bold text-foreground">{resume.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{resume.updatedAt}</p>

          <div className="mt-5 flex flex-wrap gap-2">
            <ActionButton
              className="text-primary hover:bg-secondary"
              onClick={() => router.push("/builder")}
            >
              <Download className="size-4" />
              Download
            </ActionButton>
            <ActionButton onClick={() => router.push("/builder")}>Edit</ActionButton>
            <ActionButton>Copy</ActionButton>
            <ActionButton>Share</ActionButton>
            <ActionButton disabled>Delete</ActionButton>
          </div>
        </div>
      </div>

      {/* AI banner */}
      <div className="m-1 flex flex-col items-start gap-4 rounded-2xl bg-[#F3F2FF] px-5 py-4 sm:flex-row sm:items-center">
        <Sparkles className="mt-0.5 size-5 shrink-0 text-[#8B5CF6]" />
        <p className="flex-1 text-sm font-medium leading-snug text-[#4F46E5]">
          Customizing your resume for each specific job can significantly enhance
          your chances of getting an interview
        </p>
        <button
          onClick={() => setTailorOpen(true)}
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-gradient-ai px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
        >
          Tailor this resume
          <span aria-hidden>→</span>
        </button>
      </div>

      <TailorDialog
        open={tailorOpen}
        onClose={() => setTailorOpen(false)}
        resumeTitle={resume.title}
      />
    </div>
  );
}
