"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CircleCheck, CircleX, Loader2 } from "lucide-react";
import { AuthShell, authButtonClass } from "./auth-shell";

type State = "checking" | "ok" | "failed";

/**
 * Confirms an email address from the link in the verification mail.
 *
 * The token is spent by a POST, not by the page load. A GET would be consumed
 * by anything that fetches the URL before the person does - mail scanners,
 * link previews and corporate security proxies all follow links in mail - and
 * the user would then arrive at an "already used" error for a link they never
 * clicked.
 */
export function VerifyEmailView({ token }: { token: string }) {
  const [state, setState] = useState<State>(token ? "checking" : "failed");
  const [message, setMessage] = useState<string | null>(
    token ? null : "The confirmation link is missing its code."
  );
  // React 19 in dev mounts effects twice; the token is single-use, so a second
  // POST would consume nothing and report failure for a successful confirm.
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;

    (async () => {
      try {
        const r = await fetch("/api/auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (r.ok) {
          setState("ok");
          return;
        }
        const data = await r.json().catch(() => null);
        setMessage(data?.error || "This confirmation link is invalid or has expired.");
        setState("failed");
      } catch {
        setMessage("Something went wrong. Please try again.");
        setState("failed");
      }
    })();
  }, [token]);

  if (state === "checking") {
    return (
      <AuthShell title="Confirming your email" subtitle="One moment...">
        <div className="flex justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </AuthShell>
    );
  }

  if (state === "ok") {
    return (
      <AuthShell
        title="Email confirmed"
        subtitle="Thanks. Your address is verified, so receipts and password resets will reach you."
      >
        <div className="flex flex-col items-center gap-6">
          <span className="grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-600">
            <CircleCheck className="size-8" />
          </span>
          <Link href="/dashboard" className={authButtonClass}>
            Go to my dashboard
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="We couldn't confirm that link"
      subtitle={message ?? undefined}
      footer={
        <>
          Already signed in? You can send yourself a fresh link from your{" "}
          <Link
            href="/account"
            className="font-semibold text-primary underline-offset-2 hover:underline"
          >
            account settings
          </Link>
          .
        </>
      }
    >
      <div className="flex flex-col items-center gap-6">
        <span className="grid size-16 place-items-center rounded-full bg-destructive/10 text-destructive">
          <CircleX className="size-8" />
        </span>
        <Link
          href="/dashboard"
          className="inline-flex h-12 w-full items-center justify-center rounded-[10px] bg-secondary text-sm font-semibold text-foreground transition-colors hover:bg-[color-mix(in_oklab,var(--secondary),black_4%)]"
        >
          Continue to the app
        </Link>
      </div>
    </AuthShell>
  );
}
