"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Send, Loader2, UserRoundX, SlidersHorizontal, Check, LogOut } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/utilities/utils";
import { capture } from "@/utilities/analytics";
import { EVENTS } from "@/utilities/analytics-events";
import { Input } from "@/components/forms/input";
import { PrimaryButton } from "@/components/common/brand/brand-buttons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/common/dialog";

/**
 * Remove every locally-stored piece of account data on deletion: resumes,
 * cover letters, resignation letters, saved jobs, interview-prep, tailoring
 * sessions, the premium/subscription flag, and design settings all live under
 * the `resume-co:` localStorage namespace, so clearing that namespace wipes
 * them in one pass and nothing can reappear after a fresh sign-up.
 */
function clearLocalAccountData() {
  if (typeof window === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("resume-co:")) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
    sessionStorage.removeItem("resume-co:dl");
  } catch {
    /* storage unavailable (private mode) - nothing to clear */
  }
}

/** Google brand "G" - an icon (not an emoji), inline so it inherits sizing. */
function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09a6.6 6.6 0 0 1 0-4.18V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

/** Accessible on/off switch (role="switch") used for the email opt-in. */
function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
        checked ? "bg-primary" : "bg-muted-foreground/30"
      )}
    >
      <span
        className={cn(
          "inline-block size-5 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        )}
      />
    </button>
  );
}

/** A read-only label/value row in the Personal details summary. */
function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-border/60 py-4">
      <dt className="shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

/** Rounded surface that groups one settings section. */
function SectionCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl bg-secondary p-6 sm:p-7", className)}>
      {children}
    </section>
  );
}

/**
 * Account settings page: subscription CTA, editable personal details (name),
 * email opt-in toggle, and permanent account deletion. Reads/refreshes the live
 * NextAuth session and persists changes through the /api/account route.
 */
export function AccountSettings() {
  const router = useRouter();
  const { data: session, update } = useSession();

  const fullName = session?.user?.name ?? "";
  const email = session?.user?.email ?? "";
  const provider = session?.user?.provider;

  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [emails, setEmails] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Seed the name fields from the session once it resolves.
  useEffect(() => {
    if (!fullName) return;
    const [f, ...rest] = fullName.split(" ");
    setFirst(f ?? "");
    setLast(rest.join(" "));
  }, [fullName]);

  // Email-verification state. `null` while unknown, so the row renders nothing
  // rather than flashing "unverified" at a verified user on first paint.
  const [verified, setVerified] = useState<boolean | null>(null);
  const [verifySending, setVerifySending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/auth/verify");
        if (!r.ok) return;
        const d = (await r.json()) as { verified?: boolean };
        if (!cancelled) setVerified(Boolean(d.verified));
      } catch {
        /* leave unknown - the row stays hidden */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Ask for a fresh confirmation link for the signed-in address. */
  async function resendVerification() {
    setVerifySending(true);
    try {
      const r = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const d = (await r.json().catch(() => ({}))) as {
        error?: string;
        alreadyVerified?: boolean;
      };
      if (r.ok && d.alreadyVerified) {
        setVerified(true);
        toast.success("Your email is already confirmed");
        return;
      }
      if (r.ok) {
        toast.success("Confirmation email sent", {
          description: `Check ${email} for the link.`,
        });
        return;
      }
      toast.error(d.error || "Couldn't send the email");
    } catch {
      toast.error("Couldn't send the email");
    } finally {
      setVerifySending(false);
    }
  }

  /** Persist the combined first/last name and refresh the session display name. */
  const [portalLoading, setPortalLoading] = useState(false);

  /** Open Stripe's Customer Portal in this tab (cancellation, card, invoices). */
  async function openBillingPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (res.ok && data.url) {
        void capture(EVENTS.billingPortalOpened);
        window.location.href = data.url;
        return;
      }
      // Each failure gets its own message: "no subscription yet" and "billing
      // is misconfigured" need different things from the user.
      toast.error(
        data.error === "no_customer"
          ? "You don't have a subscription yet"
          : data.error === "billing_unconfigured"
            ? "Billing isn't configured on this environment"
            : "Couldn't open the billing portal",
        {
          description:
            data.error === "no_customer"
              ? "Subscribe first, then you can manage or cancel it here."
              : "Please try again, or contact support if it keeps happening.",
        }
      );
    } catch {
      toast.error("Couldn't open the billing portal");
    } finally {
      setPortalLoading(false);
    }
  }

  async function saveName() {
    const name = [first.trim(), last.trim()].filter(Boolean).join(" ");
    if (!name) {
      toast.error("Name can't be empty");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("save failed");
      await update({ name }); // refresh the live session display name
      setEditing(false);
      toast.success("Changes saved");
    } catch {
      toast.error("Couldn't save changes", {
        description: "Please try again in a moment.",
      });
    } finally {
      setSaving(false);
    }
  }

  /** Sign out of this device but keep the account: end the NextAuth session and
   *  return to the Sign in page. Local documents are NOT cleared (unlike delete),
   *  so they resync on the next sign-in. Guards against double clicks. */
  async function signOutOfDevice() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut({ redirect: false });
      router.replace("/login");
    } catch {
      setSigningOut(false);
      toast.error("Couldn't sign out", {
        description: "Please try again in a moment.",
      });
    }
  }

  /** Open/close the confirm modal, resetting its checkbox + error each time so a
   *  re-open always starts from the safe (unchecked, no error) state. Ignored
   *  while a deletion is in flight, so the page can't be dismissed mid-request. */
  function setConfirm(open: boolean) {
    if (deleting) return;
    setConfirmOpen(open);
    setConfirmChecked(false);
    setDeleteError("");
  }

  /**
   * Permanently delete the account: cancel any subscription (server-side),
   * remove the account, wipe local data, sign out, and return to Sign in. Guards
   * against duplicate clicks, and on any failure keeps the account intact, shows
   * a clear message, and re-enables the modal controls.
   */
  async function deleteAccount() {
    if (!confirmChecked || deleting) return; // require consent; block re-entry
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (res.status === 502) {
        // Subscription cancellation failed - the account was NOT deleted.
        setDeleting(false);
        setDeleteError(
          "We couldn't cancel your subscription. Your account has not been deleted. Please try again or contact support."
        );
        return;
      }
      if (!res.ok) throw new Error("delete failed");
      // Success: clear locally-stored account data so nothing can reappear, end
      // the session, and hand off to the Sign in page with a confirmation toast.
      clearLocalAccountData();
      await signOut({ redirect: false });
      toast.success("Your account has been permanently deleted.");
      router.replace("/login");
    } catch {
      setDeleting(false);
      setDeleteError("We couldn't delete your account. Please try again.");
    }
  }

  const providerLabel =
    provider === "google" ? "Google" : provider === "credentials" ? "Email" : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-12">
      <h1 className="mb-8 font-heading text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
        Account settings
      </h1>

      <div className="space-y-5">
        {/* Subscription */}
        <SectionCard className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Subscription</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage billing, update your card, or cancel at any time.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {/* Opens Stripe's Customer Portal. Cancelling must not require
                deleting the account - that was the only route before. */}
            <button
              type="button"
              onClick={openBillingPortal}
              disabled={portalLoading}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-muted px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted/70 disabled:opacity-60"
            >
              {portalLoading && <Loader2 className="size-4 animate-spin" />}
              Manage subscription
            </button>
            <PrimaryButton onClick={() => router.push("/payment")}>
              <Send className="size-4 -rotate-45" />
              Subscribe now
            </PrimaryButton>
          </div>
        </SectionCard>

        {/* Personal details */}
        <SectionCard>
          <div className="mb-2 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <h2 className="text-xl font-bold text-foreground">Personal details</h2>
            {editing ? (
              <PrimaryButton onClick={saveName} disabled={saving}>
                {saving && <Loader2 className="size-4 animate-spin" />}
                Save changes
              </PrimaryButton>
            ) : (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-muted px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted/70"
              >
                <SlidersHorizontal className="size-4 text-muted-foreground" />
                Configure
              </button>
            )}
          </div>

          {editing ? (
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm text-muted-foreground">
                  First name
                </span>
                <Input
                  value={first}
                  onChange={(e) => setFirst(e.target.value)}
                  className="h-12 rounded-xl bg-white"
                  placeholder="First name"
                  autoFocus
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm text-muted-foreground">
                  Last name
                </span>
                <Input
                  value={last}
                  onChange={(e) => setLast(e.target.value)}
                  className="h-12 rounded-xl bg-white"
                  placeholder="Last name"
                />
              </label>
            </div>
          ) : (
            <dl>
              <DetailRow label="First name" value={first || "-"} />
              <DetailRow label="Last name" value={last || "-"} />
              {email && (
                <DetailRow
                  label="Details"
                  value={
                    <span className="inline-flex items-center gap-1.5">
                      {email}
                      {providerLabel && (
                        <>
                          <span className="text-muted-foreground">&middot;</span>
                          <span className="text-muted-foreground">{providerLabel}</span>
                          {provider === "google" && <GoogleGlyph className="size-4" />}
                        </>
                      )}
                    </span>
                  }
                />
              )}
            </dl>
          )}
        </SectionCard>

        {/* Emails */}
        <SectionCard>
          <h2 className="mb-5 text-xl font-bold text-foreground">Emails</h2>

          {/* Only shown once the state is known AND unverified: a verified user
              does not need telling, and an unresolved fetch must not accuse
              them of something that is not true. */}
          {verified === false && (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-50 px-4 py-3">
              <p className="text-sm text-amber-900">
                <span className="font-semibold">Confirm your email address.</span>{" "}
                Until you do, we can&apos;t be sure password resets and receipts
                will reach you.
              </p>
              <button
                type="button"
                onClick={resendVerification}
                disabled={verifySending}
                className="inline-flex h-9 shrink-0 items-center gap-2 rounded-[6px] bg-(--brand-blue) px-4 text-sm font-semibold text-primary-foreground transition-colors disabled:opacity-60"
              >
                {verifySending && <Loader2 className="size-4 animate-spin" />}
                Send confirmation link
              </button>
            </div>
          )}

          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Subscribe to career tips and Resumewriter.ai news, events, offers
            </p>
            <Toggle
              checked={emails}
              onChange={setEmails}
              label="Subscribe to career tips and news"
            />
          </div>
        </SectionCard>

        {/* Sign out - a neutral session action, kept separate from the
            destructive delete below. Your saved documents stay in the account. */}
        <SectionCard className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-foreground">Sign out</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign out of this device. Your resumes and letters stay safely in your
              account.
            </p>
          </div>
          <button
            type="button"
            onClick={signOutOfDevice}
            disabled={signingOut}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-[10px] border-[1.5px] border-primary bg-card px-4 text-sm font-semibold text-primary transition-colors hover:bg-accent hover:text-primary-strong focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40 disabled:opacity-60"
          >
            {signingOut ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <LogOut className="size-4" />
            )}
            Sign out
          </button>
        </SectionCard>

        {/* Delete account - visually separated from the settings cards above and
            deliberately quiet, so it never reads as the page's main action. */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setConfirm(true)}
            className="inline-flex items-center gap-2 px-1 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-destructive"
          >
            <UserRoundX className="size-4" />
            Permanently delete account
          </button>
        </div>
      </div>

      {/* Confirmation modal. onOpenChange is guarded so Escape / outside-click /
          the close icon can't dismiss it mid-deletion; the close icon is hidden
          entirely while processing. */}
      <Dialog open={confirmOpen} onOpenChange={setConfirm}>
        <DialogContent
          className="sm:max-w-lg"
          overlayClassName="bg-black/40"
          showCloseButton={!deleting}
        >
          <DialogHeader className="pr-6">
            <DialogTitle className="text-2xl">
              Are you sure you want to permanently delete your account?
            </DialogTitle>
            <DialogDescription className="mt-1">
              We&apos;re sorry to hear that you&apos;re considering leaving us. We
              want to make sure that all of your data is handled with care, so
              before we proceed with deleting your account, we just need to
              confirm a few things.
            </DialogDescription>
          </DialogHeader>

          <hr className="border-border/70" />

          {/* Consent checkbox - unchecked on open; gates the destructive button. */}
          <label
            className={cn(
              "flex items-start gap-3",
              deleting ? "cursor-not-allowed" : "cursor-pointer"
            )}
          >
            <span
              className={cn(
                "mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border-2 transition-colors",
                confirmChecked
                  ? "border-primary bg-primary"
                  : "border-muted-foreground/40 bg-white"
              )}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={confirmChecked}
                disabled={deleting}
                onChange={(e) => setConfirmChecked(e.target.checked)}
              />
              {confirmChecked && (
                <Check className="size-3.5 text-white" strokeWidth={3} />
              )}
            </span>
            <span className="text-sm leading-relaxed text-muted-foreground">
              I want to permanently delete my account and all of the data
              associated with it and immediately terminate all paid
              subscriptions. I know that this action cannot be undone and my
              account will be unrecoverable.
            </span>
          </label>

          {/* Failure message - account stays active, controls stay usable. */}
          {deleteError && (
            <p
              role="alert"
              className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
            >
              {deleteError}
            </p>
          )}

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={deleteAccount}
              disabled={!confirmChecked || deleting}
              className={cn(
                "inline-flex h-12 items-center justify-center gap-2 rounded-[10px] px-5 text-base font-semibold transition-colors",
                confirmChecked && !deleting
                  ? "bg-destructive text-white hover:bg-destructive/90"
                  : "cursor-not-allowed bg-muted text-muted-foreground"
              )}
            >
              {deleting && <Loader2 className="size-4 animate-spin" />}
              {deleting ? "Deleting account..." : "Delete account"}
            </button>
            <button
              type="button"
              onClick={() => setConfirm(false)}
              disabled={deleting}
              className="inline-flex h-12 items-center justify-center rounded-[10px] bg-secondary px-5 text-base font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
