"use client";

import { extractDocxText } from "@/utilities/docx-text";

/**
 * Read an uploaded job posting into plain text so it can be pasted into the
 * tailoring flow.
 *
 * - .txt / .md  : read directly in the browser
 * - .docx       : unzipped and stripped client-side (the model can't read Word)
 * - .pdf        : sent inline to the `extractJobPosting` AI task (Gemini reads
 *                 PDFs natively)
 *
 * Throws with a caller-friendly reason so the UI can explain what to do next.
 */
export async function extractJobPostingText(file: File): Promise<string> {
  const name = file.name.toLowerCase();

  if (/\.(txt|md|text)$/.test(name) || file.type.startsWith("text/")) {
    const text = (await file.text()).trim();
    if (!text) throw new Error("empty-file");
    return text;
  }

  if (/\.docx?$/.test(name) || file.type.includes("word")) {
    return extractDocxText(file); // throws for legacy .doc
  }

  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    const base64 = await fileToBase64(file);
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task: "extractJobPosting",
        payload: { file: { mimeType: "application/pdf", data: base64 } },
      }),
    });
    if (!res.ok) throw new Error("extract-failed");
    const json = await res.json();
    if (json.fallback) throw new Error("extract-unavailable"); // no API key
    const text = String(json.data ?? "").trim();
    if (!text) throw new Error("extract-empty");
    return text;
  }

  throw new Error("unsupported-type");
}

/** Read a File as bare base64 (no `data:...;base64,` prefix). */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
