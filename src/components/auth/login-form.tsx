"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { LogoMark } from "@/components/brand/logo-mark";

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.4 5.4 0 0 1-2.4 3.58v2.97h3.86c2.26-2.09 3.56-5.17 3.56-8.79Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-2.97c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.27 14.32a7.2 7.2 0 0 1 0-4.61V6.62H1.29a12 12 0 0 0 0 10.79l3.98-3.09Z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0A11.99 11.99 0 0 0 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z" />
    </svg>
  );
}

type Mode = "signin" | "signup";

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const isSignup = mode === "signup";

  async function credentialsSignIn() {
    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.error) {
      setError("Invalid email or password");
      return false;
    }
    return true;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (isSignup && password !== confirm) {
      setError("Passwords don't match");
      return;
    }

    setLoading(true);
    try {
      if (isSignup) {
        const r = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await r.json();
        if (!r.ok) {
          setError(data.error || "Could not create your account");
          return;
        }
      }
      const ok = await credentialsSignIn();
      if (ok) window.location.assign("/");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function onGoogle() {
    setError(null);
    if (!googleEnabled) {
      setError("Google sign-in isn't configured yet. Add AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET to .env.local.");
      return;
    }
    setGoogleLoading(true);
    signIn("google", { callbackUrl: "/" });
  }

  return (
    <main className="flex flex-1 flex-col items-center px-4 pt-16 sm:pt-20">
      <LogoMark className="size-9" />

      <h1 className="mt-10 font-heading text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
        {isSignup ? "Create your account" : "Sign in"}
      </h1>
      <p className="mt-4 text-muted-foreground">
        {isSignup ? "Let's get you started in a minute" : "Good to see you again! Welcome back"}
      </p>

      <form onSubmit={onSubmit} className="mt-8 w-full max-w-md space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-foreground">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email"
            autoComplete="email"
            className="h-12 w-full rounded-xl border border-border bg-card px-4 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-3 focus:ring-ring/30"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-foreground">Password</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isSignup ? "Create a password (min 8 characters)" : "Enter password"}
            autoComplete={isSignup ? "new-password" : "current-password"}
            className="h-12 w-full rounded-xl border border-border bg-card px-4 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-3 focus:ring-ring/30"
          />
        </label>

        {isSignup && (
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground">Confirm password</span>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter your password"
              autoComplete="new-password"
              className="h-12 w-full rounded-xl border border-border bg-card px-4 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-3 focus:ring-ring/30"
            />
          </label>
        )}

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {loading && <Loader2 className="size-4 animate-spin" />}
          {isSignup ? "Create account" : "Sign in"}
        </button>
      </form>

      {/* Divider */}
      <div className="my-7 flex w-full max-w-md items-center gap-4">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      {/* Continue with Google */}
      <button
        type="button"
        onClick={onGoogle}
        disabled={googleLoading}
        className="inline-flex h-12 w-full max-w-md items-center justify-center gap-3 rounded-full border border-border bg-card text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-secondary disabled:opacity-60"
      >
        {googleLoading ? <Loader2 className="size-4 animate-spin" /> : <GoogleGlyph />}
        Continue with Google
      </button>

      {/* Toggle */}
      <p className="mt-8 text-sm text-muted-foreground">
        {isSignup ? "Already have an account?" : "Don't have an account?"}
      </p>
      <button
        type="button"
        onClick={() => {
          setMode(isSignup ? "signin" : "signup");
          setError(null);
          setConfirm("");
        }}
        className="mt-3 h-12 w-full max-w-md rounded-full bg-secondary text-sm font-semibold text-foreground transition-colors hover:bg-[color-mix(in_oklab,var(--secondary),black_4%)]"
      >
        {isSignup ? "Sign in instead" : "Sign up now"}
      </button>
    </main>
  );
}
