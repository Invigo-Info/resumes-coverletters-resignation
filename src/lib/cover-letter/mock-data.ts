export interface CoverLetterDoc {
  id: string;
  title: string; // "Software Developer at Acme"
  updatedAt: string;
  thumb: string;
}

/** Dashboard usage / insight stats (docs §1 — Dashboard brief). */
export const coverLetterStats = {
  written: { used: 0, limit: 5, note: "Submitting more job applications daily could triple the speed of your job search" },
  applications: { value: "~250", note: "Required on average to get a single job offer" },
  daysToOffer: { value: "~84", note: "Industry average in your field" },
};

/** Mock saved cover letters. Empty this array to see the empty state. */
export const mockCoverLetters: CoverLetterDoc[] = [
  {
    id: "1",
    title: "Software Developer at Adasd",
    updatedAt: "Updated 11 Mar 2026",
    thumb: "/resume-thumb.svg",
  },
];
