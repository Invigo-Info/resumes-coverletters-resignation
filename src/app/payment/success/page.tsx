import Link from "next/link";
import { CircleCheck } from "lucide-react";
import { LogoMark } from "@/components/brand/logo-mark";
import { PrimaryButton } from "@/components/brand/brand-buttons";
import { getStripe } from "@/lib/stripe/server";

/**
 * Post-checkout confirmation page. Reads the Stripe session_id from the URL,
 * verifies the Checkout Session status server-side, and shows a success or
 * "processing" message accordingly.
 */
export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;

  // Confirm the Checkout Session status server-side (best-effort).
  let status: string | null = null;
  let email: string | null = null;
  const stripe = getStripe();
  if (stripe && session_id) {
    try {
      const s = await stripe.checkout.sessions.retrieve(session_id);
      status = s.status ?? null;
      email = s.customer_details?.email ?? null;
    } catch {
      /* ignore */
    }
  }

  // Treat a completed session as success; also show success when no session_id
  // was supplied (e.g. a direct visit) rather than a scary error.
  const ok = status === "complete" || !session_id;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="px-5 py-6 sm:px-8">
        <Link href="/" aria-label="resume.co home" className="inline-block">
          <LogoMark />
        </Link>
      </div>

      <main className="flex flex-1 flex-col items-center justify-center px-4 pb-24 text-center">
        <span className="grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-600">
          <CircleCheck className="size-9" />
        </span>
        <h1 className="mt-6 font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          {ok ? "You're all set!" : "Payment processing"}
        </h1>
        <p className="mt-3 max-w-md text-muted-foreground">
          {ok
            ? "Your Resume.co premium subscription is active. Enjoy unlimited downloads, AI-tailored resumes, and more."
            : "Your payment is being processed. You'll get a confirmation email shortly."}
          {email && <> A receipt was sent to <span className="font-medium text-foreground">{email}</span>.</>}
        </p>

        <div className="mt-8">
          <Link href="/">
            <PrimaryButton>Go to dashboard</PrimaryButton>
          </Link>
        </div>
      </main>
    </div>
  );
}
