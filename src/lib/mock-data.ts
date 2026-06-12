export interface ResumeDoc {
  id: string;
  title: string;
  updatedAt: string;
  thumb: string;
}

/** Mock saved resumes shown on the dashboard. Empty this array to see the empty state. */
export const mockResumes: ResumeDoc[] = [
  {
    id: "1",
    title: "John Mayer, Senior Marketing Manager",
    updatedAt: "Updated 11 Apr 2026",
    thumb: "/resume-thumb.svg",
  },
];
