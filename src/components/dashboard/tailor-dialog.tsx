"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Loader2, Copy, Check, FileUp, FileText } from "lucide-react";
import { toast } from "sonner";
import { tailorResume, type TailorResult } from "@/services/ai/mock";
import { extractJobPostingText } from "@/services/ai/job-posting";
import { cn } from "@/lib/utils";

/** Human explanation for each failure mode of the job-posting upload. */
const UPLOAD_ERRORS: Record<string, string> = {
  "unsupported-type": "Upload a PDF, Word (.docx), or plain-text file.",
  "extract-unavailable": "AI is unavailable right now. Paste the posting instead.",
  "not-a-docx": "That looks like an older .doc. Save it as .docx or PDF.",
};

/**
 * AI "tailor this resume" modal. The user supplies a job posting - either by
 * pasting it or uploading the file - and the AI returns an optimized summary,
 * ATS keywords, and the user's own achievements reframed for the role.
 *
 * `resumeBullets` are the candidate's REAL experience bullets. They are what
 * the achievements are reframed from; without them the AI is told to return
 * none rather than invent accomplishments.
 *
 * When `initialJobDescription` is supplied (e.g. opened from a job's Scoreboard),
 * the description is pre-filled and the tailoring runs automatically.
 */
export function TailorDialog({
  open,
  onClose,
  resumeTitle,
  resumeBullets,
  initialJobDescription,
}: {
  open: boolean;
  onClose: () => void;
  resumeTitle: string;
  resumeBullets?: string[];
  initialJobDescription?: string;
}) {
  const [jd, setJd] = useState("");
  const [loading, setLoading] = useState(false);
  const [reading, setReading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<TailorResult | null>(null);
  const [copied, setCopied] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  /** Send the job description to the AI helper and show the tailored result. */
  async function run(description?: string) {
    const text = (description ?? jd).trim();
    if (!text) return;
    setLoading(true);
    setResult(null);
    // Resume titles are "Name, Job title" - pull the title half for context.
    const jobTitle = resumeTitle.split(",")[1]?.trim();
    const res = await tailorResume({
      jobDescription: text,
      jobTitle,
      bullets: resumeBullets,
    });
    setResult(res);
    setLoading(false);
  }

  /** Read an uploaded job posting (PDF / .docx / .txt) into the textarea. */
  async function readPosting(file?: File) {
    if (!file) return;
    setReading(true);
    try {
      const text = await extractJobPostingText(file);
      setJd(text);
      setFileName(file.name);
    } catch (err) {
      const reason = err instanceof Error ? err.message : "";
      toast.error("We couldn't read that job posting", {
        description:
          UPLOAD_ERRORS[reason] ?? "Try another file, or paste the posting text.",
      });
    } finally {
      setReading(false);
    }
  }

  // Pre-fill + auto-run when opened from a job posting's Scoreboard CTA.
  useEffect(() => {
    if (open && initialJobDescription) {
      setJd(initialJobDescription);
      setResult(null);
      run(initialJobDescription);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialJobDescription]);

  /** Copy a block of generated text and flash a transient confirmation. */
  function copy(key: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 1500);
  }

  const busy = loading || reading;

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
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-tile-strong text-white">
                <Sparkles className="size-5" />
              </span>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-foreground">Tailor this resume</h2>
                <p className="text-sm text-muted-foreground">
                  Paste or upload a job posting and AI will optimize your summary,
                  keywords, and achievements.
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
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt,.md"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = ""; // allow re-selecting the same file
                  readPosting(file);
                }}
              />

              {/* Upload the posting */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  readPosting(e.dataTransfer.files?.[0]);
                }}
                onClick={() => !reading && fileRef.current?.click()}
                className={cn(
                  "flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors",
                  dragging
                    ? "border-primary bg-primary/5"
                    : "border-border bg-background/60 hover:border-primary/50"
                )}
              >
                {reading ? (
                  <Loader2 className="size-6 animate-spin text-primary" />
                ) : (
                  <FileUp className="size-6 text-muted-foreground" />
                )}
                <span className="text-sm text-muted-foreground">
                  {reading ? (
                    "Reading the posting…"
                  ) : (
                    <>
                      Drop the job posting here or{" "}
                      <span className="font-semibold text-primary">choose a file</span>
                    </>
                  )}
                </span>
                <span className="text-xs text-muted-foreground">PDF, Word, or text</span>
              </div>

              {fileName && !reading && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="size-4 shrink-0 text-primary" />
                  Loaded from <span className="font-medium text-foreground">{fileName}</span>
                </p>
              )}

              {/* Or paste it */}
              <div className="space-y-1.5">
                <label htmlFor="tailor-jd" className="text-sm font-medium text-foreground">
                  Job description
                </label>
                <textarea
                  id="tailor-jd"
                  value={jd}
                  onChange={(e) => {
                    setJd(e.target.value);
                    setFileName("");
                  }}
                  rows={6}
                  placeholder="Paste the job posting here…"
                  className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                />
              </div>

              <button
                onClick={() => run()}
                disabled={busy || !jd.trim()}
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
                <div className="space-y-5 rounded-2xl bg-muted/50 p-4">
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground">
                        Tailored summary
                      </p>
                      <CopyButton
                        active={copied === "summary"}
                        onClick={() => copy("summary", result.summary)}
                      />
                    </div>
                    <p className="text-sm leading-relaxed text-foreground">
                      {result.summary}
                    </p>
                  </div>

                  {result.achievements.length > 0 && (
                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <p className="text-sm font-semibold text-foreground">
                          Tailored achievements
                        </p>
                        <CopyButton
                          active={copied === "achievements"}
                          onClick={() =>
                            copy("achievements", result.achievements.join("\n"))
                          }
                        />
                      </div>
                      <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-foreground marker:text-primary">
                        {result.achievements.map((a) => (
                          <li key={a}>{a}</li>
                        ))}
                      </ul>
                    </div>
                  )}

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

/** Small text button that flips to "Copied" for a moment after being pressed. */
function CopyButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:opacity-80"
    >
      {active ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {active ? "Copied" : "Copy"}
    </button>
  );
}
