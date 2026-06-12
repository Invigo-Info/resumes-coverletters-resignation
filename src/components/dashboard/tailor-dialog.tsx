"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Loader2, Copy, Check } from "lucide-react";
import { tailorResume } from "@/lib/ai/mock";

export function TailorDialog({
  open,
  onClose,
  resumeTitle,
}: {
  open: boolean;
  onClose: () => void;
  resumeTitle: string;
}) {
  const [jd, setJd] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ summary: string; keywords: string[] } | null>(
    null
  );
  const [copied, setCopied] = useState(false);

  async function run() {
    if (!jd.trim()) return;
    setLoading(true);
    setResult(null);
    const jobTitle = resumeTitle.split(",")[1]?.trim();
    const res = await tailorResume({ jobDescription: jd, jobTitle });
    setResult(res);
    setLoading(false);
  }

  function copySummary() {
    if (result) {
      navigator.clipboard.writeText(result.summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-card shadow-card-lg"
          >
            {/* Header */}
            <div className="flex items-start gap-3 border-b border-border px-6 py-5">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-ai text-white">
                <Sparkles className="size-5" />
              </span>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-foreground">Tailor this resume</h2>
                <p className="text-sm text-muted-foreground">
                  Paste a job description and AI will optimize your summary and keywords.
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Job description
                </label>
                <textarea
                  value={jd}
                  onChange={(e) => setJd(e.target.value)}
                  rows={6}
                  placeholder="Paste the job posting here…"
                  className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                />
              </div>

              <button
                onClick={run}
                disabled={loading || !jd.trim()}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-ai px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                {loading ? "Tailoring…" : "Tailor with AI"}
              </button>

              {result && (
                <div className="space-y-4 rounded-2xl bg-muted/50 p-4">
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground">
                        Tailored summary
                      </p>
                      <button
                        onClick={copySummary}
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:opacity-80"
                      >
                        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                        {copied ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <p className="text-sm leading-relaxed text-foreground">
                      {result.summary}
                    </p>
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-semibold text-foreground">
                      Suggested keywords
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {result.keywords.map((k) => (
                        <span
                          key={k}
                          className="rounded-full bg-card px-3 py-1 text-xs font-medium text-foreground ring-1 ring-border"
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
