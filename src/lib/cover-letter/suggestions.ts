/** Static chip/suggestion data for the cover-letter wizard (from screenshots). */

/** Professional skills — first 3 render with a 🔥 (step 4). */
export const CL_SKILLS = [
  "SEO Optimization",
  "Content Marketing",
  "Social Media Management",
  "Email Marketing",
  "Data Analysis",
  "Market Research",
  "Brand Development",
  "PPC Advertising",
  "Graphic Design",
  "Project Management",
  "CRM Software Proficiency",
  "Copywriting",
  "Web Analytics",
  "Lead Generation",
  "Digital Marketing Strategy",
];

/** Strengths / personality traits (step 10). */
export const CL_STRENGTHS = [
  "Leader",
  "Diplomatic",
  "Solution-oriented",
  "Self-motivated",
  "Communicative",
  "Cheerful",
  "Adaptable",
  "Good at time management",
  "Problem-solver",
  "Creative",
  "Attentive to details",
  "Good listener",
  "Analyst",
  "Flexible",
];

/** Suggested target roles for the "No specific job" path (step 12). */
export const CL_ROLES = [
  "Software developer",
  "Healthcare professional",
  "Cybersecurity analyst",
  "Financial analyst",
  "IT manager",
  "Data scientist",
  "Marketing manager",
  "Teacher",
];

/** Universities for the degree step (step 8). */
export const CL_UNIVERSITIES = [
  "Harvard University",
  "Stanford University",
  "Massachusetts Institute of Technology (MIT)",
  "Princeton University",
  "Pomona College",
  "Williams College",
  "Amherst College",
];

/** Fields of study (step 9). */
export const CL_FIELDS = [
  "Computer Science",
  "Business Administration",
  "Management",
  "Engineering",
  "Psychology",
  "Biology",
  "Communications",
  "Economics",
];

/** Experience options (step 5). */
export const CL_EXPERIENCE = ["~1", "2", "3", "4", "5", "6", "7", "8", "9", "10+"];

/** Dynamic helper text under the experience picker (step 5). */
export function experienceLabel(value: string): string {
  if (value === "~1") return "Just starting out";
  if (["2", "3"].includes(value)) return "Early career";
  if (["4", "5", "6"].includes(value)) return "Mid-level professional";
  if (["7", "8", "9"].includes(value)) return "Experienced professional";
  if (value === "10+") return "Senior / Expert level";
  return "";
}
