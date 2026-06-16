"use client";

import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PrimaryButton } from "@/components/brand/brand-buttons";

export function EmptyState({
  heading = "If you don't have a resume yet, it's a great time to create one!",
  buttonLabel = "Build my resume",
  href = "/resume-creation-menu",
}: {
  heading?: string;
  buttonLabel?: string;
  href?: string;
} = {}) {
  return (
    <div className="flex flex-col items-center gap-6 py-10 text-center">
      <Image
        src="/illustration.png"
        alt="Diverse professionals"
        width={544}
        height={379}
        className="w-[420px] max-w-full"
        unoptimized
        priority
      />
      <h1 className="max-w-md font-heading text-2xl font-extrabold leading-snug text-foreground">
        {heading}
      </h1>
      <Link href={href}>
        <PrimaryButton>
          <Plus className="size-4" />
          {buttonLabel}
        </PrimaryButton>
      </Link>
    </div>
  );
}
