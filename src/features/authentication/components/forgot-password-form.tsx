"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, MailCheck } from "lucide-react";
import {
  AuthShell,
  authInputClass,
  authButtonClass,
} from "./auth-shell";

/**
 * "Forgot your password" request form.
 *
 * On success it shows the SAME confirmation whether or not the address is
 * registered, matching the API, which answers identically by design. Telling
 * the visitor "no account with that email" would turn this box into an account
 * lookup for any address someone cares to type - on a resume site that reveals
 * who is job hunting.
 */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address");
      return;
    }
    setLoading(true);
    try {
      const r = await fetch("/api/auth/password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (r.status === 429) {
        setError("Too many requests. Please try again later.");
        return;
      }
      if (!r.ok) {
        const data = await r.json().catch(() => null);
        setError(data?.error || "Something went wrong. Please try again.");
        return;
      }
      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <AuthShell
        title="Check your email"
        subtitle={`If an account exists for ${email.trim()}, we've sent a link to choose a new password. It expires in an hour.`}
        footer={
          <>
            Didn&apos;t get it? Check your spam folder, or{" "}
            <button
              type="button"
              onClick={() => setSent(false)}
              className="font-semibold text-primary underline-offset-2 hover:underline"
            >
              try a different address
            </button>
            .
          </>
        }
      >
        <div className="flex flex-col items-center gap-6">
          <span className="grid size-16 place-items-center rounded-full bg-primary/10 text-primary">
            <MailCheck className="size-8" />
          </span>
          <Link
            href="/login"
            className="inline-flex h-12 w-full items-center justify-center rounded-[10px] bg-secondary text-sm font-semibold text-foreground transition-colors hover:bg-[color-mix(in_oklab,var(--secondary),black_4%)]"
          >
            Back to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="Enter the email you signed up with and we'll send you a link to choose a new one."
      footer={
        <>
          Remembered it?{" "}
          <Link
            href="/login"
            className="font-semibold text-primary underline-offset-2 hover:underline"
          >
            Back to sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-foreground">
            Email
          </span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email"
            autoComplete="email"
            autoFocus
            suppressHydrationWarning
            className={authInputClass}
          />
        </label>

        {error && (
          <p
            className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
            role="alert"
          >
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className={authButtonClass}>
          {loading && <Loader2 className="size-4 animate-spin" />}
          Send reset link
        </button>
      </form>
    </AuthShell>
  );
}
