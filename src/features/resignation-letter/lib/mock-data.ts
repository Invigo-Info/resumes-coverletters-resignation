/** A saved resignation letter as listed on the dashboard, including the lines shown in its thumbnail. */
export interface ResignationLetterDoc {
  id: string;
  title: string; // "John Mayer at Microsoft Corporation"
  name: string; // letterhead name
  updatedAt: string;
  theme: "light" | "dark"; // letterhead style shown in the thumbnail
  /** A few preview lines rendered in the mini document thumbnail. */
  preview: {
    date: string;
    recipient?: string[];
    body: string;
    email: string;
  };
}

/**
 * Mock saved resignation letters shown on the dashboard (Step 1.png).
 * Empty this array to see the empty state.
 */
export const mockResignationLetters: ResignationLetterDoc[] = [
  {
    id: "1",
    title: "John Mayer",
    name: "John Mayer",
    updatedAt: "Updated 44 minutes ago",
    theme: "light",
    preview: {
      date: "April 14, 2026",
      body: "I am writing to formally resign from my position, with my last working day being 28 April 2026.",
      email: "john.mayer17800@gmail.com",
    },
  },
  {
    id: "2",
    title: "John Mayer at Microsoft Corporation",
    name: "John Mayer",
    updatedAt: "Updated 14 Nov 2025",
    theme: "dark",
    preview: {
      date: "March 1, 2025",
      recipient: ["To Emily Johnson", "Microsoft Corporation", "One Microsoft Way, Redmond, WA 98052"],
      body: "I am writing to formally resign from my position as Software Engineer at Microsoft Corporation, with my last working day being 15 March 2025.",
      email: "john.mayer17800@gmail.com",
    },
  },
];
