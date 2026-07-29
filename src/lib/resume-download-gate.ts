"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { safeLocalStorage } from "@/lib/store/safe-storage";
import { usePaywall } from "@/lib/cover-letter/paywall";
import { FREE_RESUME_LIMIT } from "@/lib/limits";

export { FREE_RESUME_LIMIT };

/**
 * Free-tier document-download allowance. A free account may download up to
 * FREE_RESUME_LIMIT distinct documents PER KIND (3 resumes, 3 cover letters, 3
 * resignation letters); a further new document of that kind requires a
 * subscription. Re-downloading a document already counted is always free, and
 * premium accounts are unlimited. The downloaded ids are persisted so the
 * allowance survives reloads.
 */
export type DownloadKind = "resume" | "coverLetter" | "resignationLetter";

const emptyMap = (): Record<DownloadKind, string[]> => ({
  resume: [],
  coverLetter: [],
  resignationLetter: [],
});

interface DownloadGateState {
  downloadedIds: Record<DownloadKind, string[]>;
  recordDownload: (kind: DownloadKind, id: string) => void;
}

export const useDownloadGate = create<DownloadGateState>()(
  persist(
    (set, get) => ({
      downloadedIds: emptyMap(),
      recordDownload: (kind, id) => {
        if (!id) return;
        const ids = get().downloadedIds[kind] ?? [];
        if (ids.includes(id)) return;
        set((s) => ({
          downloadedIds: {
            ...s.downloadedIds,
            [kind]: [...(s.downloadedIds[kind] ?? []), id],
          },
        }));
      },
    }),
    {
      name: "resume-co:downloads",
      storage: createJSONStorage(() => safeLocalStorage),
      // Fill any missing kind so an older/partial persisted blob can't break reads.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<DownloadGateState>;
        return {
          ...current,
          ...p,
          downloadedIds: { ...emptyMap(), ...(p.downloadedIds ?? {}) },
        };
      },
    }
  )
);

/**
 * Non-reactive check for click handlers: may this document be downloaded now?
 * Premium: always. Free: yes if this document was already downloaded, or fewer
 * than FREE_RESUME_LIMIT distinct documents of this kind have been downloaded.
 */
export function canDownload(kind: DownloadKind, id: string): boolean {
  if (usePaywall.getState().premium) return true;
  const ids = useDownloadGate.getState().downloadedIds[kind] ?? [];
  if (id && ids.includes(id)) return true;
  return ids.length < FREE_RESUME_LIMIT;
}

/** Record a successful download so it counts against the free allowance. */
export function recordDownload(kind: DownloadKind, id: string): void {
  useDownloadGate.getState().recordDownload(kind, id);
}

/* Kind-specific convenience wrappers (used by the download buttons). */
export const canDownloadResume = (id: string) => canDownload("resume", id);
export const recordResumeDownload = (id: string) => recordDownload("resume", id);
export const canDownloadCoverLetter = (id: string) => canDownload("coverLetter", id);
export const recordCoverLetterDownload = (id: string) =>
  recordDownload("coverLetter", id);
export const canDownloadResignationLetter = (id: string) =>
  canDownload("resignationLetter", id);
export const recordResignationLetterDownload = (id: string) =>
  recordDownload("resignationLetter", id);

/** Reactive free-tier download state for optional UI hints. */
export function useDownloadAllowance(kind: DownloadKind) {
  const map = useDownloadGate((s) => s.downloadedIds);
  const premium = usePaywall((s) => s.premium);
  const used = (map[kind] ?? []).length;
  return {
    premium,
    used,
    limit: FREE_RESUME_LIMIT,
    remaining: Math.max(0, FREE_RESUME_LIMIT - used),
    atLimit: !premium && used >= FREE_RESUME_LIMIT,
  };
}
