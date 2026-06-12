"use client";

import type { CLFlow, CoverLetterState } from "@/lib/store/cover-letter-store";
import { parseResumeAi } from "@/lib/cover-letter/ai";
import { mockResumes } from "@/lib/mock-data";

/**
 * Persona fallbacks used when no live AI parse is available (missing key,
 * upload with no extractable text, or an AI error). These match the
 * step 18 / step 30 review screenshots.
 */
function personaFor(flow: CLFlow): Partial<CoverLetterState> {
  if (flow === "upload") {
    // Sophia Carter (matches step 18 review screenshot)
    return {
      education: { level: "college", university: "London School of Economics", field: "Marketing and Management" },
      recentJob: { jobTitle: "Marketing Manager", company: "Google" },
      experience: "10+",
      skills: ["SEO Optimization", "Content Marketing", "Data Analysis"],
      strengths: ["Self-motivated", "Communicative", "Creative"],
      personal: {
        firstName: "Sophia",
        lastName: "Carter",
        email: "sophia.carter.marketing@gmail.com",
        phone: "+44 7720 556789",
        address: "27 Kingsway St, London, United Kingdom, W1D 4HJ",
      },
    };
  }

  // use-resume → John Mayer (matches step 30 review screenshot)
  return {
    education: { level: "college", university: "University of Houston", field: "Marketing" },
    recentJob: { jobTitle: "Senior Marketing Manager", company: "CWF Restoration" },
    experience: "10+",
    skills: ["Data Analysis", "Market Research", "Brand Development"],
    strengths: ["Leader", "Creative", "Adaptable"],
    personal: {
      firstName: "John",
      lastName: "Mayer",
      email: "john.mayer17800@gmail.com",
      phone: "(713) 555-4822",
      address: "",
    },
  };
}

/**
 * Maps a saved/uploaded resume into the cover-letter store fields.
 *
 * Phase 9: AI-first. For "use-resume" we feed the selected resume's title
 * into the live Gemini `parseResume` task; if the key/call is unavailable it
 * transparently falls back to the persona above. Upload has no extractable
 * text yet (the file isn't read client-side), so it uses the persona directly.
 * The persona also backfills any field the AI leaves blank.
 */
export async function parseResumeForCoverLetter(
  flow: CLFlow,
  sourceResumeId?: string
): Promise<Partial<CoverLetterState>> {
  const persona = personaFor(flow);

  // Only the use-resume flow currently has parseable text (the resume title).
  if (flow !== "use-resume") return persona;

  const resume = mockResumes.find((r) => r.id === sourceResumeId) ?? mockResumes[0];
  const ai = await parseResumeAi({ resumeTitle: resume?.title });
  if (!ai) return persona;

  // Merge: AI values win, persona backfills anything the AI left empty.
  return {
    education: { ...persona.education!, ...nonEmpty(ai.education) },
    recentJob: { ...persona.recentJob!, ...nonEmpty(ai.recentJob) },
    experience: ai.experience || persona.experience,
    skills: ai.skills?.length ? ai.skills : persona.skills,
    strengths: ai.strengths?.length ? ai.strengths : persona.strengths,
    personal: { ...persona.personal!, ...nonEmpty(ai.personal) },
  };
}

/** Drop empty-string / nullish fields so they don't overwrite persona values. */
function nonEmpty<T extends object>(obj?: T): Partial<T> {
  if (!obj) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== "" && v != null) out[k] = v;
  }
  return out as Partial<T>;
}
