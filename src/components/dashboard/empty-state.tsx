"use client";

import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PrimaryButton } from "@/components/brand/brand-buttons";

export function EmptyState() {
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
        If you don&apos;t have a resume yet, it&apos;s a great time to create one!
      </h1>
      <Link href="/resume-creation-menu">
        <PrimaryButton>
          <Plus className="size-4" />
          Build my resume
        </PrimaryButton>
      </Link>
    </div>
  );
}
