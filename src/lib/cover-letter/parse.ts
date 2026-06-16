"use client";

import type { CLFlow, CoverLetterState } from "@/lib/store/cover-letter-store";
import type { ResumeState } from "@/lib/store/resume-store";
import { parseResumeAi } from "@/lib/cover-letter/ai";
import { parseResume } from "@/lib/ai/parseResume";
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
  sourceResumeId?: string,
  file?: File
): Promise<Partial<CoverLetterState>> {
  const persona = personaFor(flow);

  // Uploaded a real file → extract the candidate's ACTUAL details via Gemini
  // (same PDF extractor the resume builder uses), then map into CL fields.
  if (flow === "upload" && file) {
    try {
      const r = resumeToCoverLetter(await parseResume(file));
      return {
        // Prefill the desired job title from the resume so the "No" path (and
        // the job-details step) starts with the candidate's actual role.
        jobDetails: {
          desiredJobTitle: r.desiredJobTitle,
          companyName: "",
          hiringManagerName: "",
          jobDescription: "",
        },
        education: { ...persona.education!, ...nonEmpty(r.education) },
        recentJob: { ...persona.recentJob!, ...nonEmpty(r.recentJob) },
        experience: r.experience || persona.experience,
        skills: r.skills.length ? r.skills : persona.skills,
        strengths: persona.strengths, // resumes don't carry "strengths"
        personal: { ...persona.personal!, ...nonEmpty(r.personal) },
      };
    } catch {
      // Unreadable upload → show blanks (not a stranger's persona) so the user
      // fills in their own details; keep only the generic strengths.
      return {
        personal: { firstName: "", lastName: "", email: "", phone: "", address: "" },
        recentJob: { jobTitle: "", company: "" },
        education: { level: "college", university: "", field: "" },
        skills: [],
        strengths: persona.strengths,
        experience: "",
      };
    }
  }

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

/** Map an extracted resume into the cover-letter store fields. */
function resumeToCoverLetter(r: Partial<ResumeState>) {
  const emp = r.employment?.find((e) => e.jobTitle || e.company);
  const edu = r.education?.find((e) => e.institution || e.degree);
  return {
    // The resume headline (or most recent role) becomes the desired job title.
    desiredJobTitle: (r.personal?.jobTitle || emp?.jobTitle || "").trim(),
    personal: {
      firstName: r.personal?.firstName ?? "",
      lastName: r.personal?.lastName ?? "",
      email: r.contact?.email ?? "",
      phone: r.contact?.phone ?? "",
      address: r.contact?.location ?? "",
    },
    recentJob: { jobTitle: emp?.jobTitle ?? "", company: emp?.company ?? "" },
    education: {
      level: "college" as const,
      university: edu?.institution ?? "",
      field: edu?.degree ?? "",
    },
    skills: (r.skills ?? []).map((s) => s.name).filter(Boolean).slice(0, 8),
    experience: estimateExperience(r.employment),
  };
}

/** Rough total years of experience from the earliest employment start year. */
function estimateExperience(employment?: ResumeState["employment"]): string {
  if (!employment?.length) return "";
  const years = employment
    .map((e) => Number((e.startDate.match(/(19|20)\d{2}/) ?? [])[0]))
    .filter((y) => y > 0);
  if (!years.length) return "";
  const total = new Date().getFullYear() - Math.min(...years);
  if (total <= 0) return "";
  return total >= 10 ? "10+" : String(total);
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
