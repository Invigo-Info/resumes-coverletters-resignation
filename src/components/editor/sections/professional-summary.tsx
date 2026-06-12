"use client";

import { useRef, useState } from "react";
import { RotateCcw, Sparkles } from "lucide-react";
import { useResumeStore } from "@/lib/store/resume-store";
import {
  generateSummary,
  improveSummary,
  SUMMARY_TONES,
  type ToneId,
} from "@/lib/ai/mock";
import { AiButton } from "@/components/brand/brand-buttons";
import { cn } from "@/lib/utils";
import { SectionHeading } from "./field";
import { RichTextEditor } from "../rich-text-editor";

const strip = (html: string) => html.replace(/<[^>]*>/g, "").trim();

export function ProfessionalSummaryForm() {
  const summary = useResumeStore((s) => s.summary);
  const setSummary = useResumeStore((s) => s.setSummary);
  const jobTitle = useResumeStore((s) => s.personal.jobTitle);

  const [loading, setLoading] = useState(false);
  const [aiMode, setAiMode] = useState(false);
  const [tone, setTone] = useState<ToneId>("enthusiastic");
  const [mode, setMode] = useState<"write" | "improve">("write");
  const originalRef = useRef("");

  const hasContent = strip(summary).length > 0;

  async function run(nextTone: ToneId, m: "write" | "improve") {
    setLoading(true);
    setTone(nextTone);
    const text =
      m === "improve"
        ? await improveSummary({
            tone: nextTone,
            text: strip(originalRef.current),
            jobTitle,
          })
        : await generateSummary({ tone: nextTone, jobTitle });
    setSummary(`<p>${text}</p>`);
    setAiMode(true);
    setLoading(false);
  }

  function startAi() {
    const m: "write" | "improve" = hasContent ? "improve" : "write";
    setMode(m);
    originalRef.current = summary;
    run(tone, m);
  }

  return (
    <div>
      <SectionHeading
        title="Professional summary"
        description="This section draws the most attention from recruiters. Start with your role and years of experience, then mention 2-3 key skills and achievements. Keep it to 2-4 sentences."
      />

      <RichTextEditor
        value={summary}
        onChange={setSummary}
        minHeight={150}
        placeholder="Account Manager with 3 years' experience in client relations. Strong in communication and CRM tools."
        toolbarRight={
          <AiButton onClick={startAi} disabled={loading}>
            {loading
              ? mode === "improve"
                ? "Improving…"
                : "Writing…"
              : hasContent
                ? "Improve with AI"
                : "Write with AI"}
          </AiButton>
        }
      />

      {aiMode && (
        <div className="mt-4 rounded-xl border border-dashed border-[var(--ai-from)]/40 bg-[var(--ai-from)]/[0.04] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles className="size-4 text-[var(--ai-from)]" />
            AI suggestion — pick a tone
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {SUMMARY_TONES.map((t) => {
              const active = t.id === tone;
              return (
                <button
                  key={t.id}
                  onClick={() => run(t.id, mode)}
                  disabled={loading}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50",
                    active
                      ? "bg-foreground text-background"
                      : "bg-card text-foreground ring-1 ring-border hover:bg-muted"
                  )}
                >
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: t.color }}
                  />
                  {t.label}
                </button>
              );
            })}

            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => run(tone, mode)}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-sm font-medium text-foreground ring-1 ring-border transition-colors hover:bg-muted disabled:opacity-50"
              >
                <RotateCcw className="size-3.5" />
                Rewrite
              </button>
              <button
                onClick={() => setAiMode(false)}
                className="inline-flex items-center rounded-full bg-gradient-ai px-4 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Use
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
