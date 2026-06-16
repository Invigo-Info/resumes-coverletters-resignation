import { redirect } from "next/navigation";
import { COVER_LETTER_FIRST_SLUG } from "@/lib/section-routes";

/**
 * Legacy entry point. The cover-letter wizard now lives at
 * /cover-letters/write/<step> so every step has its own shareable URL.
 */
export default function CoverLetterBuilderPage() {
  redirect(`/cover-letters/write/${COVER_LETTER_FIRST_SLUG}`);
}
