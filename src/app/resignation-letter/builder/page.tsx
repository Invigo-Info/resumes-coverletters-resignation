import { redirect } from "next/navigation";
import { RESIGNATION_FIRST_SLUG } from "@/lib/section-routes";

/**
 * Legacy entry point. The resignation-letter wizard now lives at
 * /resignation-letters/write/<step> so every step has its own shareable URL.
 */
export default function ResignationLetterBuilderPage() {
  redirect(`/resignation-letters/write/${RESIGNATION_FIRST_SLUG}`);
}
