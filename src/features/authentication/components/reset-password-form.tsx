"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import {
  AuthShell,
  authInputClass,
  authButtonClass,
} from "./auth-shell";

/**
 * "Choose a new password" form, reached from the emailed link.
 *
 * The token stays in component state and is sent in the request BODY. It
 * arrives in the query string because an email link has nowhere else to put it,
 * but it is never put into a form action or a further navigation, so it does
 * not spread into additional history entries or referrer headers.
 */
export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // No token at all - someone opened the page directly or the link was mangled
  // by a mail client. Say so plainly instead of showing a form that cannot work.
  if (!token) {
    return (
      <AuthShell
        title="This link is incomplete"
        subtitle="The reset link is missing its code. Request a fresh one and open it directly from the email."
      >
        <Link
          href="/forgot-password"
          className={authButtonClass}
          style={{ textDecoration: "none" }}
        >
          Request a new link
        </Link>
      </AuthShell>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }

    setLoading(true);
    try {
      const r = await fetch("/api/auth/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => null);
        setError(data?.error || "Could not reset your password.");
        return;
      }
      setDone(true);
      // Deliberately NOT auto-signed-in. Doing that would mean the reset
      // endpoint has to hand the email back to the client so it can call
      // signIn, and it would turn a consumed token straight into a live
      // session. Sending them to /login instead costs one password entry and
      // confirms they can actually use what they just set.
      window.location.assign("/login?reset=1");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <AuthShell
        title="Password updated"
        subtitle="Taking you to sign in with your new password..."
      >
        <div className="flex justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Pick something at least 8 characters long. Any other reset links for this account will stop working."
      footer={
        <>
          Changed your mind?{" "}
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
            New password
          </span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a password (min 8 characters)"
            autoComplete="new-password"
            autoFocus
            suppressHydrationWarning
            className={authInputClass}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-foreground">
            Confirm new password
          </span>
          <input
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Re-enter your password"
            autoComplete="new-password"
            suppressHydrationWarning
            className={authInputClass}
          />
        </label>

        {error && (
          <p
            className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
            role="alert"
          >
            {error}{" "}
            {/* An expired or spent link is the common failure, and the only
                way out of it is a new one - so always offer that route. */}
            <Link
              href="/forgot-password"
              className="font-semibold underline underline-offset-2"
            >
              Request a new link
            </Link>
          </p>
        )}

        <button type="submit" disabled={loading} className={authButtonClass}>
          {loading && <Loader2 className="size-4 animate-spin" />}
          Update password
        </button>
      </form>
    </AuthShell>
  );
}
