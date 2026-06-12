"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import type { CoverLetterDoc } from "@/lib/cover-letter/mock-data";
import { cn } from "@/lib/utils";

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

export function CoverLetterCard({ doc }: { doc: CoverLetterDoc }) {
  const router = useRouter();

  return (
    <div className="rounded-3xl bg-card p-3 shadow-card-lg">
      <div className="flex flex-col gap-5 p-4 sm:flex-row sm:gap-7">
        {/* Thumbnail */}
        <div className="shrink-0 overflow-hidden rounded-lg ring-1 ring-border">
          <Image
            src={doc.thumb}
            alt={`${doc.title} preview`}
            width={120}
            height={160}
            className="h-[160px] w-[120px] object-cover"
          />
        </div>

        {/* Details + actions */}
        <div className="flex flex-1 flex-col">
          <h2 className="text-lg font-bold text-foreground">{doc.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{doc.updatedAt}</p>

          <div className="mt-5 flex flex-wrap gap-2">
            <ActionButton
              className="text-primary hover:bg-secondary"
              onClick={() => router.push("/cover-letter/preview")}
            >
              <Download className="size-4" />
              Download
            </ActionButton>
            <ActionButton onClick={() => router.push("/cover-letter/preview")}>Edit</ActionButton>
            <ActionButton>Copy</ActionButton>
            <ActionButton disabled>Delete</ActionButton>
          </div>
        </div>
      </div>
    </div>
  );
}
